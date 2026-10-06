# C0 verdict on WP-0A-A0-008 (PR #208), first at any head

Subject: PR https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/208, branch
`agent/claude/WP-0A-A0-008-service-path`, head `25d449ca`, merge-base with `main` = `0955b32` (PR #203).
Current `main` at the time of this reading: `9b4a0ce` (PR #206). Three files changed:
`evidence/WP-0A-A0-008/author-self-check-2026-10-07.md` (new), `handoffs/WP-0A-A0-008-author-handoff.json`,
`work-packages/WP-0A-A0-008.json`.

The file name follows the workflow's instruction (`c0-contract-reverify-2026-10-05.md`); the run took
place on 2026-10-07. It is not a re-verification in substance: **there was no earlier C0 verdict for this
package.** At `25d449c` the folder `evidence/WP-0A-A0-008/` holds only the Author's self-check, and before
this PR the folder did not exist. So there are no earlier C0 conditions to close; this is the first C0
verdict, and it reviews the whole increment.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, spawned by A0's workflow script to act as the independent Reviewer
run `/claude/c0_contract_reviewer`. RFC-2026-024 §3/3 requires this disclosure. I share a vendor and a
parent with the Author. I wrote none of the PR's content and I fix nothing. This file is not a merge
authorisation, not a security, test or integration verdict, and it moves no package status.

## 1. Method, and what was measured versus read

Private clone under the scratchpad (`.../scratchpad/c0-WP-0A-A0-008/repo`), checked out on the branch
NAME, never detached: `HEAD = 25d449ca`, `merge-base HEAD origin/main = 0955b32` at checkout. Node
`v24.20.0`, npm `11.19.0`. A private Postgres 17 cluster on port **5650** only (scratchpad data dir,
`trust`, the CI shim applied), stopped at the end. The clone ended clean.

**Measured** (commands and exit codes in §5):

- `npm run check` on the branch name: exit 0, 716 tests, pass 716.
- The package's declared validators, `verify-branch-identity`, `check:handoff`, the secret scan, and
  `verify-branch-scope` against **both** `0955b32` and the current `main` `9b4a0ce`.
- `make db-migrate-clean` and `make db-rls-smoke` on the 5650 cluster: 1200 isolation cases passed;
  the authz proofs report 14 claims discharged and 1 NOT RUN (`worker-login-authentication`).
- `open_blockers[0]`'s counts, by importing `buildCases` from `tests/db/identity/isolation-cases.mjs`,
  plus a breakdown of every `as_service` case by `expect` and `deniedBy`.
- The `_run_id_disambiguation` correction: `/root/r0_steward` in each of the six committed versions.
- The `independence` and `product_reviewer_note` fields of all fifteen step-2 packages.
- PR #208's state and its required check, and live branch protection on `main` (read-only `gh`).

**Read, not measured:** `RFC-2026-017` (all of it), `RFC-2026-028` lines 1-8, the Owner's step-2
disposition (`evidence/WP-0A-A0-001/product-owner-disposition-2026-10-05-g0-step2.md` §3), the A1
countersignature (`evidence/WP-0A-DB-00/a1-countersignature-role-topology.md` §0 and §7), the Author's
self-check and handoff. I did not judge DATA-DEC-03's security substance; that is A1's.

## 2. Earlier conditions

None exist. This is the first C0 verdict for WP-0A-A0-008 (manifest `open_blockers[3]`, which I confirm:
`git ls-tree` of the branch shows only the Author's file in `evidence/WP-0A-A0-008/`).

## 3. What the increment claims, checked

| Claim (Author's `done` list) | Reading | Basis |
|---|---|---|
| Branch name as declared; synced with `0955b32` before push | **Holds** at the time of push; now behind (F1) | `merge-base = 0955b32`; `verify-branch-identity` exit 0 |
| Status `in_progress` → `in_review`, no further | **Holds** | manifest diff |
| Step 2 item 1: `prefer_cross_vendor_review: false`, exception replaced by the sibling wording | **Holds** | Measured: sentence by sentence equal to WP-0A-A0-007's after swapping the package id, except A0-007's sentence on "the A1 analysis this package's RFC rests on", which has no counterpart here and needs none. Twelve of the fifteen step-2 packages now read `false` with the `WITHDRAWN 2026-10-05` opening; A0-006, A0-009 and CON-008 still read `true` (their packages' business). |
| Step 2 item 2: `_run_id_disambiguation` rewritten; no version of `open_blockers` ever named `/root/r0_steward` | **Holds** | Measured: for `e95957c`, `d289ded`, `2c6ccde`, `6f7233f`, `5ab581a`, `c1f2647` (all commits touching the file before this branch), 0 blockers name it and the one occurrence in each file is this field. `.agents/capability-profiles/cc-r0-steward.json` exists. `grep -rl WP-0A-A0-008 work-packages contract-catalog` returns only this manifest, so no `amended_by` entry is pending. |
| Step 2 item 3: `product_reviewer_note` added, flagged for C0 | **Accepted** (F5) | |
| `open_blockers[0]` re-measured: 61 cover §7, 20 denied over 20 of 62 tables | **Holds**, and answered (F3) | Measured at `25d449c` (no file under `tests/db` or `db/` differs from `4dd767d`): 1200 cases; 61 labelled `RFC-2026-017§7`: 20 `denied`, 39 `no-rows`, 2 `no-effect`; 20 distinct `app.` targets; 62 distinct `app.` tables created by the migrations. |
| `open_blockers[1]` narrowed to RFC-2026-028 and migration 173 | **Holds in conclusion**, one sentence incomplete (F2) | |
| `open_blockers[3]` added (no role verdict at any head) | **Holds** | |
| `required_human_authorities` current states appended | **Holds**; item 2 answered with a qualification (F4) | `8c16c0d` is the Owner's approval of RFC-2026-017 (line 3) |
| Self-check written; tests via `commit-when-clean` | **Holds** | 716/716 reproduced here |
| Not a governance PR | **Holds** | no RFC, `CONTRIBUTING_AGENTS.md`, CI or gate touched; also not record-only (RFC-2026-025 §5 item 1), because it rewords blockers and applies an Owner disposition |

The six acceptance criteria read true against `RFC-2026-017` at this head, as the self-check §6 says;
criterion 6 is met at `e95957c` and the later `Approved` status (`8c16c0d`) is history, not a regression.

## 4. Findings

### F1 (Blocking the merge, not the content) — `main` moved; the PR is behind and the required check would fail on re-run

`main` is now `9b4a0ce` (PR #206). `gh pr view 208`: `mergeStateStatus: BEHIND`; branch protection on
`main` is `strict: true`, contexts `["bootstrap"]`, `enforce_admins: true`. `bootstrap` is green on
`25d449c` (run `37508038445`, against the older base), but `verify-branch-scope.mjs 9b4a0ce WP-0A-A0-008`
exits **73**, reporting PR #206's three WP-0A-A0-005 paths as changes this package neither owns nor
records. Same class as WP-0A-A0-007's C0 F1. The Author syncs with `main` and refreshes the handoff as
the last commit (which this file, and the other role files, also require, since they land after the
handoff). No C0 re-check is needed if the PR's own diff is unchanged by the sync.

### F2 (Minor) — `open_blockers[1]`'s last sentence is true of what it names and incomplete about what exists

"No case in the isolation suite connects AS app_worker_login" is literally true of the 1200 isolation
cases, and the self-check §4's grep ("No test or helper under `tests/` or `db/foundation/test-helpers/`
mentions `app_worker_login`") is true of those two directories. But `scripts/db/authz-proofs.mjs`, on
`main` since `631512b` (an ancestor of `4dd767d`), **logs in as `app_worker_login`**, and `make
db-rls-smoke` (the CI step) runs it. Measured on 5650: `worker-login-can-only-become-app-worker`,
`worker-login-reads-nothing-by-default` (51 of 51 tables `app_worker` may read return zero rows through the
login role) and `worker-login-no-workspace-lingers` are `ok`; `worker-login-authentication` is `NOT RUN`
because the cluster admits the role under `trust`. RFC-2026-028's own header, which the blocker tells the
reader to read as a whole, says so ("§5/1-4, /6-10, /12-14 executed (the live cases in
`scripts/db/authz-proofs.mjs`, logged in as the role ...)").

The blocker's conclusion is unchanged: those proofs run on migrate-clean clusters, 173 is declared not
applied to the provisioned instance, authentication (§5/12) is unexercised where `trust` admits the
role, and custody, pooler and the runner's checks remain open. So the production service path is still
unproven. But a reader of the blocker alone would conclude nothing exercises the login role, which is
false. A one-clause addition fixes it: *the RFC-2026-028 §5 live proofs in `scripts/db/authz-proofs.mjs`
do log in as it, on migrate-clean clusters, with §5/12 NOT RUN where `trust` admits it.* Not blocking.

### F3 (Answer to the question put to C0) — RFC-2026-017 §7's negative assertion exists; C0 reads §7's ask as met at the policy layer

§7 asks for "the service identity attempting an operation the matrix marks `N` for service and being
**denied with an error, not an empty result**", and says it "does not exist yet". Measured:

- 166 cases run as `as_service`. 112 expect `denied`: 82 at the GRANT layer, 29 at the POLICY layer, 1
  unspecified. The §7 label is on 20 of them, all INSERTs, 19 with `deniedBy: 'policy'` plus the first
  case `service-identity-is-denied-a-write-with-an-error`.
- The 28 → 20 fall the Author left unexplained is a labelling rule, not lost coverage.
  `identity-isolation.test.mjs:284-298` requires every §7-labelled `denied` case to be an INSERT (an
  UPDATE filtered by `USING` raises nothing), and the suite's comments (e.g. `isolation-cases.mjs:6524`,
  `identity-isolation.test.mjs:9155-9170`) take the label off every GRANT-layer refusal, because §7's
  claim is a refusal BY row level security and a refusal without a grant "proves only that somebody
  forgot a GRANT". The 10 unlabelled POLICY-layer service denials are on cells §8.3 marks `S`, not `N`
  (publish, research, webhook receipt), so they are not §7's shape either.
- The test "the assertion RFC-2026-017 §7 says is owed exists, and it demands an error"
  (`identity-isolation.test.mjs:284`) pins the claim statically; the runner maps `denied` to
  `expectDenied` only (line 277); `private.as_service()` lands on `app_worker`, which does not bypass; and
  the CI negative control re-runs the suite with RLS disabled per table and requires it to fail.
- Executed here: `make db-rls-smoke` on 5650, 1200 cases passed, exit 0.

So the assertion §7 names **exists, demands an error, runs as a role that does not bypass, and is a CI
control.** The 39 `no-rows` cases are §7's read half (what notices `BYPASSRLS`), not substitutes for the
error, and "20 of 62 tables" is not a shortfall against §7: §7 asks for the assertion, not per-table
coverage, which is §12.6's and the negative control's matter. **C0's reading: `open_blockers[0]`'s
question is answered yes, at the policy layer, on migrate-clean clusters with the CI shim.** It says
nothing about the platform or the production path (`open_blockers[1]`). Recording the closure in the
manifest is the Author's act citing this file; A1 and Q0 may read it differently and their verdicts
stand beside mine. RFC-2026-017's status line ("Isolation remains unproven until the negative assertion
in §7 exists") and §7's "it does not exist yet" are now stale; correcting them is a governance PR
(RFC-2026-025 §5 item 6) owned by the RFC's owner, and this PR is right not to.

### F4 (Info) — `required_human_authorities[1]`: substance answered, order not

The item asks for A1 "to countersign the role topology **before the roles are created**". The
countersignature exists, by A1 as DATA-DEC-03's co-owner, over exactly the three roles RFC-2026-017 §3
names; the item names A1, not a run of this package, so C0 reads it as answering the item's substance
for WP-0A-A0-008. Two qualifications the current-state note should carry:

- **Order.** The roles were created in `dab9637` (`001_service_roles.sql`, 2026-09-05 22:07 +0700); the
  countersignature was added in `aaa35ef` (2026-09-06 03:14 +0700) and signs catalog state in which the
  roles already existed. "Before" was not met and cannot now be. That is a fact to record, not a defect
  this PR introduced.
- **Reservations.** Its §7 discharges WP-0A-DB-00's blocker "with the reservations in §4 and the seven
  defects in §5 recorded as open". Whether any of them bears on this package is `/claude/a1_bastion`'s
  to say, and the note already says this is not the `security_approved` gate.

### F5 (Info) — the item-3 mapping is accepted

The disposition's §3 row 3 itself reasons from "the 15 packages' `review_and_test_gates` carry no product
step" and names a UX surface as what still needs a Product/UX reviewer. WP-0A-A0-008 is one of the fifteen
by A0's mapping, has no UX surface, and its gates carry no product step. So item 3 reaches it by the
disposition's own reasoning, not only by A0's mapping. I accept the note as written.

### F6 (Info) — for the record

- Self-check §6 row 3 verified: `app_authz` is created by `011_authorization_helpers.sql` and
  `app_worker_login` by `173_worker_login_identity.sql`; RFC-2026-017 §3 names neither. History, not
  a defect of the RFC at the time.
- The handoff cites head `3b685f8` while the PR head is `25d449c`, the handoff-only commit "last and
  alone"; `check:handoff` reports "nothing substantive after its cited head".

### What I checked and found sound

The three changed paths are in `writable_paths`; `forbidden_paths` (`db/**`, `migrations/**`, key files)
are untouched; `RFC-2026-017` is unchanged; no contract, migration, script, case or fixture changed; the
corrected blockers keep their indices; nothing claims a role verdict or a status past `in_review`;
DATA-DEC-03 is not claimed closed beyond what RFC-2026-017's disposition already says.

## 5. Commands

| Command (clone on the branch name) | Exit | Result |
|---|---|---|
| `git rev-parse --abbrev-ref HEAD` / `HEAD` / `merge-base HEAD origin/main` | 0 | branch name / `25d449ca` / `0955b32e` |
| `npm ci --ignore-scripts` | 0 | — |
| `npm run check` | 0 | tests 716, pass 716, fail 0, skipped 0, todo 0 |
| `npm run check:handoff` | 0 | "nothing substantive after its cited head" |
| `node scripts/validate-work-packages.mjs` / `validate-work-package-ownership.mjs` / `validate-work-package-role-separation.mjs work-packages/WP-0A-A0-008.json` | 0 / 0 / 0 | — |
| `node scripts/scan-repository-secrets.mjs` | 0 | — |
| `node scripts/verify-branch-identity.mjs agent/claude/WP-0A-A0-008-service-path` | 0 | `WP-0A-A0-008` |
| `node scripts/verify-branch-scope.mjs origin/main WP-0A-A0-008` (`0955b32`) | 0 | "all 3 changed path(s) are declared" |
| `node scripts/verify-branch-scope.mjs 9b4a0ce… WP-0A-A0-008` | **73** | PR #206's three paths reported (F1) |
| `initdb` + `pg_ctl … -p 5650` (scratchpad, `trust`); `psql -f db/foundation/ci/supabase-shim.sql` | 0 | — |
| `make db-migrate-clean` | 0 | — |
| `make db-rls-smoke` | 0 | "1200 isolation case(s) passed"; "db-authz-proofs: ok — 14 claim(s) discharged by execution; 1 not run on this cluster (worker-login-authentication)" |
| `node count.mjs` / `count2.mjs` / `count3.mjs` (read-only, scratchpad, import `buildCases`) | 0 | 1200 / 61 / 20 / 39 / 2; 20 tables; 62 `app.` tables; 166 service cases, 112 denied (82 grant, 29 policy, 1 unspecified) |
| `node hist.mjs` (`git show <c>:work-packages/WP-0A-A0-008.json`, six commits) | 0 | 0 blockers name `/root/r0_steward`; 1 occurrence each, the field |
| `node sib.mjs` (fifteen step-2 manifests) | 0 | 12 withdrawn incl. A0-008; A0-006, A0-009, CON-008 still `true` |
| `gh pr view 208` (read) | 0 | OPEN, Draft, head `25d449c`, MERGEABLE, `BEHIND`, `bootstrap` SUCCESS |
| `gh run view 37508038445` (read) | 0 | `pull_request`, head `25d449c`, success |
| `gh api …/branches/main/protection` (read) | 0 | `strict: true`, `contexts: ["bootstrap"]`, `enforce_admins: true` |
| `pg_ctl … stop` | 0 | cluster stopped |

## 6. Verdict

**`approved` for the Reviewer role (C0), on the content at head `25d449c`.**

- **Earlier conditions:** none; this is the first C0 verdict for WP-0A-A0-008.
- **The increment's content is sound.** Step 2 items 1-3 are applied as the disposition allows and no
  further; the `_run_id_disambiguation` correction is measured true; the counts in `open_blockers[0]`
  reproduce exactly; `open_blockers[1]`'s conclusion holds; the six acceptance criteria hold against
  `RFC-2026-017`. I accept the item-3 mapping (F5).
- **The §7 question (F3):** answered yes at the policy layer. The negative assertion RFC-2026-017 §7
  names exists, demands an error, runs as a non-bypassing role and is a CI control. The production
  service path stays open (`open_blockers[1]`).
- **`required_human_authorities[1]` (F4):** answered in substance by the existing A1 countersignature;
  its "before the roles are created" was not met; reservations are A1's to weigh.
- **Stop-the-line: none.** No secret, tenant data, migration, side effect, CI change or contract meaning
  is touched.
- **The merge is blocked** by F1 (behind `main` `9b4a0ce` under strict protection; scope check exits 73
  against current `main`) and by the first verdicts still owed from `/claude/a1_bastion`
  (security_approved), `/claude/q0_sentinel` (test_verified) and `/claude/r0_steward`
  (integration_verified). F2 is a one-clause wording fix, not blocking; F3-F6 are Info or answers.
  After the role files land, the Author syncs with `main` and refreshes the handoff as the last commit.
