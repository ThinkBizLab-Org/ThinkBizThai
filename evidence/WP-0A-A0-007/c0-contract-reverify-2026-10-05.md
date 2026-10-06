# C0 verdict on WP-0A-A0-007 (PR #200), first at any head

Subject: PR https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/200, branch
`agent/claude/WP-0A-A0-007-amend-section-2`, head `1509aef6`, branch point `main @ b61735f`, current
`main @ d863f40` (PR #199). Three files changed: `evidence/WP-0A-A0-007/author-self-check-2026-10-06.md`
(new), `handoffs/WP-0A-A0-007-author-handoff.json`, `work-packages/WP-0A-A0-007.json`.

The file name follows the workflow's instruction (`c0-contract-reverify-2026-10-05.md`); the run took
place on 2026-10-06. It is not a re-verification in substance: **there was no earlier C0 verdict for this
package.** Before this PR there was no `evidence/WP-0A-A0-007/` folder, and at `1509aef` the folder holds
only the Author's self-check. So there are no earlier C0 conditions to close; this is the first C0
verdict, and it reviews the whole increment.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, spawned by A0's workflow script to act as the independent Reviewer
run `/claude/c0_contract_reviewer`. RFC-2026-024 §3/3 requires this disclosure. I share a vendor and a
parent with the Author. I wrote none of the PR's content and I fix nothing. This file is not a merge
authorisation, not a security, test or integration verdict, and it moves no package status.

## 1. Method, and what was measured versus read

Private clone under the scratchpad (`.../scratchpad/c0-WP-0A-A0-007/repo`), checked out on the branch
NAME, never detached: `HEAD = 1509aef6`, `merge-base HEAD origin/main = b61735f`, `origin/main = d863f40`.
Node `v24.20.0`, npm `11.19.0` (`zsh -lc`). No database was started or used by me. The clone ended clean.

**Measured** (commands and exit codes in §5):

- `npm run check` on the branch name: exit 0, 705 tests, pass 705, fail/skipped/todo 0.
- The three declared package validators, `verify-branch-identity`, `check:handoff`, and
  `verify-branch-scope` against **both** the branch point and the current `main`.
- The required CI check `bootstrap` on head `1509aef` and its failing step, read with `gh pr view` /
  `gh run view` (read-only).
- Live branch protection on `main` (`gh api`, read-only).
- The `_run_id_disambiguation` correction: the count of `root/r0_steward` in every committed version of
  the manifest.
- The `independence` and `product_reviewer_note` fields of all fifteen step-2 packages, compared with a
  read-only script.

**Read, not measured:** `RFC-2026-016` (all of it, at the branch head; unchanged from `main`),
`RFC-2026-028` lines 3 and 6, `RFC-2026-022` lines 3 and 15-25, `RFC-2026-025` §5 items 1, 2 and 6, the
Owner's step-2 disposition (`evidence/WP-0A-A0-001/product-owner-disposition-2026-10-05-g0-step2.md`),
the Author's self-check and handoff. I did not judge DATA-DEC-03's security substance; that is A1's.

## 2. Earlier conditions

None exist. This is the first C0 verdict for WP-0A-A0-007 (manifest `open_blockers[4]`, which I confirm:
`git ls-tree` of the branch shows only the Author's file in `evidence/WP-0A-A0-007/`).

## 3. What the increment claims, checked

| Claim (Author's `done` list) | Reading | Basis |
|---|---|---|
| Status `in_progress` → `in_review`, no further | **Holds** | manifest diff; the Author may move work only through `in_review` (`CONTRIBUTING_AGENTS.md` § Separation of duties) |
| Step 2 item 1 applied: `prefer_cross_vendor_review: false`, exception replaced by the sibling wording, plus the A1 sentence | **Holds** | Measured: with this PR, eleven of the fifteen step-2 packages carry the same `WITHDRAWN 2026-10-05 ...` opening and `false`; A0-007's text matches A0-005's sentence for sentence, except that it quotes the disposition's §1.2 framing more carefully and adds that the A1 analysis is still not a role signature, which `RFC-2026-016` §7 supports ("spawned from the A0 session"). Four (A0-006, A0-008, A0-009, CON-008) still read `true`; that is their packages' business. |
| Step 2 item 2: `_run_id_disambiguation` rewritten; no version of `open_blockers` ever named `/root/r0_steward` | **Holds** | Measured: `git show <c>:work-packages/WP-0A-A0-007.json \| grep -c root/r0_steward` → `1` for `53d7d2e`, `dd6c7ec`, `cff15d1`, `f3e0bce`, the four commits that touched the file (`git log b61735f -- work-packages/WP-0A-A0-007.json`), and the one hit is the field itself. `.agents/capability-profiles/cc-r0-steward.json` exists. "Naming a successor is not the successor acting" matches the disposition's §3 row 2. `amends_without_owning.paths` is `[]`. |
| Step 2 item 3: `product_reviewer_note` added, flagged for C0 | **Accepted** (my reading below) | |
| `open_blockers[1]` narrowed against RFC-2026-028 and migration 173 | **Holds in substance**, wording F2 | `RFC-2026-028` line 3 (Approved 2026-10-05, identity and pins) and line 6 (`173_worker_login_identity.sql`, "declared not applied to the provisioned instance until Q-028-13 ... (and Q170-c)", custody Q-028-3, pooler Q-028-12, A1R-2 owed to RFC-2026-026's worker half). `db/foundation/migrations/173_worker_login_identity.sql` is on `main`. The tail ("no document may state that forced RLS constrains the service path") is unchanged and still true. |
| `open_blockers[2]` loses its cross-vendor clause, with the reason; `[4]` added | **Holds** | The clause's ground is item 1. The removed text is in git and the blocker says what it used to say. |
| `RFC-2026-016` untouched, so not a governance PR | **Holds** | `git diff --stat b61735f 1509aef` lists the three files only. `RFC-2026-025` §5 item 6 names an RFC, `CONTRIBUTING_AGENTS.md`, CI or a gate; none is changed. |
| Handoff refreshed last and alone | **Holds at `1509aef`** | `npm run check:handoff` exit 0; `1509aef` touches only the handoff. |
| "Syncing the branch with main d863f40 ... is not needed" (not-done item 4) | **Falsified** | F1 |

**On item 3 (the question put to C0).** The Owner's words are "tooling and contract work packages do not
need a Product reviewer". WP-0A-A0-007 is a decision-record package. I accept A0's mapping, for three
reasons: (a) the disposition's own §3 row 3 grounds the item on the fact that "the 15 packages'
`review_and_test_gates` carry no product step", and WP-0A-A0-007 is one of the 15 by the same mapping as
item 1; (b) the one exception that row names is "a package with a UX surface", and this package has none;
(c) the decision it records (DATA-DEC-03, the RLS policy set) is a data-contract decision in everything but
the package's label. The note states that the reading is A0's and invites refusal; that is the right form.

**Acceptance criteria, re-read against `RFC-2026-016` at the branch head.** 1 (§1) met. 2 met — see F4
for the precision of the reading. 3 (§3, "decided on 2026-09-04", with the reason "recorded because it was
not") met. 4 (§4, "this RFC does not claim the control") met as written; §4's and the status line's
"the service path is undecided" describe 2026-09-05 (the Author's not-done item 2, which I agree belongs to
the RFC's owner via the governance path). 5 (§7) met. 6 met at `53d7d2e` (status `Proposed`); the later
`Approved` status is history, not a regression.

## 4. Findings

### F1 (blocks the merge) — the required check is red, and the branch must contain the current `main`

The required check `bootstrap` on head `1509aef` **failed** (run `37475987264`, step "Verify branch
scope", exit 73):

```
WP-0A-A0-007 changed 3 path(s) it neither owns nor records as an amendment:
  evidence/WP-0A-A0-002/records-transcription-2026-10-06.md
  handoffs/WP-0A-A0-002-author-handoff.json
  work-packages/WP-0A-A0-002.json
```

CI passes `BASE_SHA = d863f40` (the base branch tip), not the branch point. Reproduced in my clone:
`node scripts/verify-branch-scope.mjs d863f40… WP-0A-A0-007` → exit **73**, same three paths;
against `b61735f` → exit 0. The three paths are PR #199's, which this branch does not contain, so the
comparison reads them as this branch's changes.

The Author's not-done item 4 says a sync is not needed because scope against the branch point exits 0.
That is the measurement CI does not make. Independently of CI, `RFC-2026-025` §5 item 6 requires for a
delegated merge that "the PR's head must contain the current `main`", and live protection on `main`
reads `strict: true`, `contexts: ["bootstrap"]`, `enforce_admins: true`.

Required (Author): merge `origin/main` into the branch, then `npm run refresh:handoff` so the handoff is
again last and alone, and get `bootstrap` green on that head. **No C0 re-check is needed for that** as long
as `git diff <new main>...HEAD` still lists only the three files with the blobs reviewed here
(`work-packages/WP-0A-A0-007.json`, the self-check, and a handoff differing only in its cited
revisions); R0 can confirm that. Not stop-the-line: nothing reaches `main` while the check is red.

Observation for the CI owner, not this package: the scope step compares against the base tip, so every
open PR reports the other merged PRs' paths as its own until it syncs. That is a strict-up-to-date regime
by another name and is consistent with §5 item 6; the failure message just does not say "sync".

### F2 (non-blocking) — `open_blockers[1]` attributes its list to the wrong line of RFC-2026-028

The blocker says "WHAT IS STILL OPEN, as RFC-2026-028's own status line names it". The status line
(line 3) names custody (Q-028-3), the pooler (Q-028-12, with Q170-c), Q-028-5 and A1's acceptance. "Not
applied to the provisioned instance until Q-028-13 and Q170-c" and A1R-2 are on line 6 ("Implemented in
part"). And the status line's Q-028-5 (the `app.jobs` columns) is not in the blocker's list. Omitting
Q-028-5 is defensible — it is not about how the service path connects — but the attribution should read
"as RFC-2026-028's status and implementation lines name them". One-phrase fix, same pass as F1 if the
Author wants; it does not change the blocker's meaning.

### F3 (Info) — the self-check and handoff list a commit that did not touch the manifest

`author-self-check-2026-10-06.md` §3 and the handoff's `reviewer_instructions[2]` list `93bbdb6` among
"every commit that touched this manifest". `93bbdb6` changed only `RFC-2026-016` and
`test-kits/integrity-manifest.json`. The manifest's own claim ("53d7d2e..f3e0bce") and the count are
correct; only the list is one too long.

### F4 (Info) — criterion 2 is met by the CARRIED sentence plus RFC-2026-022, not by RFC-2026-016 alone

Amended `RFC-2026-016` §2 says "no new permission **in the CARRIED shape**". For the DISCOVERED shape it
says the service role gets no policy, and the `SECURITY DEFINER` broker's owner "holds the policy"; it does
not say that owner's policy adds nothing beyond the matrix. `RFC-2026-022` (status line, §3) is where the
broker's policy is bounded. The self-check's "met, in the amended wording" is a fair reading; a precise one
would cite RFC-2026-022 for the DISCOVERED half. A1 may want to confirm the broker owner's policy is no
wider than the cell.

### F5 (Info) — counts and stale sentences, for the record

- Of the fifteen step-2 packages, four still read `prefer_cross_vendor_review: true` at this head
  (A0-006, A0-008, A0-009, CON-008); none is this package's, and the handoff already names A0-008/009 next.
- `required_human_authorities[2]` still reads "decide the service path (supabase-js ... or a direct
  driver ...)". The Author left it deliberately and records its standing in the self-check §5. That is
  acceptable, but a reader of the manifest alone sees it disagree with `open_blockers[1]`; a parenthetical
  pointing at `[1]` would remove the doubt.
- `RFC-2026-016`'s status line, §4 and §7 (the cross-vendor clause) are now stale. Owed by the RFC's owner
  through the governance path; this PR is right not to touch them.

### What I checked and found sound

The three changed paths are in `writable_paths`; `forbidden_paths` (`db/**`, `migrations/**`, key files)
are untouched; no contract, migration, script, case or fixture changed; the corrected blockers keep their
indices and say what they used to say; nothing claims an acknowledgement, a role verdict or a status past
`in_review`; DATA-DEC-03 is not claimed closed anywhere.

## 5. Commands

| Command (clone on the branch name) | Exit | Result |
|---|---|---|
| `git rev-parse --abbrev-ref HEAD` / `HEAD` / `merge-base HEAD origin/main` / `origin/main` | 0 | branch name / `1509aef6` / `b61735f7` / `d863f405` |
| `npm ci --ignore-scripts` | 0 | — |
| `npm run check` | 0 | tests 705, pass 705, fail 0, skipped 0, todo 0 |
| `npm run check:handoff` | 0 | "nothing substantive after its cited head" |
| `node scripts/verify-branch-identity.mjs agent/claude/WP-0A-A0-007-amend-section-2` | 0 | `WP-0A-A0-007` |
| `node scripts/verify-branch-scope.mjs b61735f… WP-0A-A0-007` | 0 | 3 changed paths declared |
| `node scripts/verify-branch-scope.mjs d863f40… WP-0A-A0-007` | **73** | PR #199's three paths reported (F1) |
| `node scripts/validate-work-packages.mjs` / `validate-work-package-ownership.mjs` / `validate-work-package-role-separation.mjs work-packages/WP-0A-A0-007.json` | 0 / 0 / 0 | — |
| `git show <c>:work-packages/WP-0A-A0-007.json \| grep -c root/r0_steward` for `53d7d2e`, `dd6c7ec`, `cff15d1`, `f3e0bce` | 0 | 1 each |
| `node siblings.mjs` (read-only, scratchpad) | 0 | 11 of 15 withdrawn incl. A0-007; A0-006/008/009, CON-008 still `true` |
| `gh pr view 200` (read) | 0 | OPEN, Draft, head `1509aef`, MERGEABLE, `bootstrap` **FAILURE** |
| `gh run view 37475987264 --log-failed` (read) | 0 | "Verify branch scope" exit 73, `BASE_SHA d863f40` |
| `gh api …/branches/main/protection` (read) | 0 | `strict: true`, `contexts: ["bootstrap"]`, `enforce_admins: true` |

## 6. Verdict

**`approved` for the Reviewer role (C0), on the content at head `1509aef`.**

- **Earlier conditions:** none; this is the first C0 verdict for WP-0A-A0-007.
- **The increment's content is sound.** Step 2 items 1-3 are applied as the disposition allows and no
  further; the `_run_id_disambiguation` correction is measured true; `open_blockers[1]` is narrowed to
  what RFC-2026-028 leaves open; the six acceptance criteria hold against `RFC-2026-016` at `main`. I
  accept the item-3 mapping for this decision-record package.
- **Stop-the-line: none.** No secret, tenant data, migration, side effect, CI change or contract meaning
  is touched.
- **Not a governance PR** (RFC-2026-025 §5 item 6), and not record-only (§5 item 1): it rewords blockers
  and applies an Owner disposition.
- **The merge is blocked** by F1: the required check `bootstrap` is red on `1509aef`, and §5 item 6
  requires the head to contain the current `main`. The Author syncs and refreshes the handoff; no C0
  re-check is needed if the PR's own diff is unchanged. F2 is a one-phrase wording fix, not blocking; F3-F5
  are Info.
- **Still owed, outside this role:** the first verdicts of `/claude/a1_bastion` (security_approved),
  `/claude/q0_sentinel` (test_verified) and `/claude/r0_steward` (integration_verified); and, because this
  file is committed after the handoff, a handoff refresh as the last commit once role files land on the
  branch.
