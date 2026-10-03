# Q0 independent re-check: batch 141 preparation's review round (PR #169)

- **Package:** `WP-0A-DB-00`. **Role:** Independent Tester, run `/claude/q0_sentinel`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-141-prep`
  (<https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/169>, Draft, open), head `9be87ca` (handoff alone)
  over code `cc00ccc` and plan section 7 `f8f1320`, base `c5a648e` (main). The head I reviewed before was
  `047a0e2`. Author `/claude/a0_atlas`. This is a narrow re-check of the review round
  (`047a0e2..9be87ca`), starting from my own findings Q0-F1 to Q0-F7
  (`q0-batch-141-prep-test-review-2026-10-03.md`).
- **Reviewed on:** my own branch `recheck/q0-batch-141-prep`, checked out at `9be87ca` in this worktree. The
  branch name is checked out in two other worktrees (`wf_a6bb823c-490-1`, `-490-5`). For the two commands
  that read the branch name (`npm run check:handoff`, `npm run verify`), I pointed this worktree's HEAD at
  `refs/heads/agent/claude/WP-0A-DB-00-batch-141-prep` with `git symbolic-ref`. That is the same SHA
  `9be87ca`, the tree was clean, I made no commit and moved no ref. `git rev-parse --abbrev-ref HEAD` printed
  the branch name, and I pointed HEAD back straight afterwards. Never detached.
- **Status:** this file records findings. It advances no status, approves nothing and fixes nothing.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author's own workflow, and the same vendor and model family as the
Author (RFC-2026-024). I am independent of the Author's run, but not of its vendor or its orchestration. So this
record is evidence for the Tester role, not that role's signature. Accepting it as the role's signature is the
act of the Integration Owner and the Product Owner.

## 1. Measured vs read

Node `v24.20.0` (`/Users/bank/.local/node-v24.20.0/bin/node`), checked with `node -v` before every measured run.
The PATH Node 26 never ran a measured command.

**Measured (exit codes I observed myself):**

| Command | Where | Exit | Output |
|---|---|---|---|
| `npm run check:handoff` | branch name, `9be87ca` | **0** | "describes the branch: nothing substantive after its cited head" |
| `npm run verify` | branch name, `9be87ca` | **0** | `clean: exit 0 — tests 681, pass 681, fail 0, skipped 0, todo 0` |
| `node scripts/verify-branch-scope.mjs c5a648e WP-0A-DB-00` | `9be87ca` | **0** | "all 28 changed path(s) are declared, and every amendment explains one" |
| `node scripts/regenerate-integrity-manifest.mjs --check` | | **0** | 88 digests; `git status` empty afterwards |
| `node scripts/scan-repository-secrets.mjs` | | **0** | |
| `make db-schema-lint` / `make db-contract-check` | static | **0 / 0** | ok / ok |
| `node --test test-kits/db/foundation-contract.test.mjs` | | **0** | tests 77, pass 77; the four batch-141 tests open at `:3321`, `:3359`, `:3486`, `:3601`, as the handoff says |
| assertion and name count (the guard's own `stripNonCode` + `\bassert\.\w+\(`, and its name digest) on `git show` of each tree | `047a0e2` / `9be87ca` | n/a | **613 / 633** assertions, **77 / 77** tests, digest `a91ced9f62276ebe` both. The floor `633` (`scripts/test-suite-contract.mjs:187`) is the guard's own count, and no test was added or renamed. |
| cherry-pick fidelity: `git diff X~1 X` of each source against each pick, `index` lines ignored | `a231fe7`/`549e76d`, `a7b8c48`/`db699ee`, `1062fc2`/`251db95` | n/a | identical, all three. My own record `251db95` is byte-identical to what I committed at `1062fc2`. |
| 118 reversal probes (§2), each one file, restored byte for byte (sha256 compared) | `9be87ca` | n/a | 4 controls survive; **all 8 probes behind Q0-F1 to Q0-F6 now fail a batch-141 test**; of 37 new probes, 28 bite and 9 survive (§2) |
| `gh pr view 169` | | | Draft, OPEN, MERGEABLE, head `9be87ca`; "Bootstrap validation" `bootstrap` SUCCESS (run 37138227949) |
| `lsof -iTCP:5503 -sTCP:LISTEN` | end of run | 1 | no listener |

**Live DB: not run, so there is no cluster to remove.** Nothing a live layer reads changed in the round.
`git diff --stat 047a0e2 9be87ca` touches no migration, invariant, fixture SQL, isolation case, Makefile or CI
file. Of the files it does touch, only `service-policy-map.json` is read by `scripts/db/run.mjs`, and only by the
static `schema-lint` target (`run.mjs:3202-3203`). The static suites read it too, for example
`tests/db/identity/identity-isolation.test.mjs:10697-10698`, as the corrected plan §4 says. I did not have to
re-run a drift. I started no cluster on 5503.

**Read, not measured:** plan §4, §5 and §7 (diff `047a0e2..f8f1320`), the disposition (unchanged by the round), the
five commit messages, the handoff diff, and the edits to `open_blockers[33]` and `[191]`. My A0 claim check
(that `a0-141-prepr2/probes.mjs` exists and holds 21 probes) is a count of the file, not a re-run of it.

## 2. Reversal probes

Harness: `q0-141-prepr2/probes.mjs` in the private scratchpad. It is the first round's 81 probes with 37 new
ones appended. Each probe mutates one file, runs
`node --test --test-reporter=tap test-kits/db/foundation-contract.test.mjs` with a 256 MB buffer (plus
`make db-schema-lint` when the file is the policy map or a migration), records the failing tests, then restores
the file and compares its sha256. `git status` was empty at the end. T1-T4 are the four batch-141 tests, in
order.

**My first round's findings, re-probed:**

| probe | first round | now |
|---|---|---|
| MG04 `jsonb` column in 140's body, MG05 `bigint` (Q0-F1) | nothing | **T3** |
| MG11 later `alter table app.audit_logs add column` (Q0-F1) | only generic new-migration tests | **T3** (plus the 17 generic ones) |
| CM25 support row loses 191 (Q0-F2) | nothing | **T2** |
| CM22 `"Zone"` outside §8 (Q0-F3) | nothing | **T2** |
| CM23 row gains `producer` (Q0-F4) | nothing | **T2** |
| FX05 `rights` -> `zzz` (Q0-F5) | nothing | **T4** |
| MG03 later `create policy p on "app"."audit_logs"` (Q0-F6) | only generic tests | **T1** (plus generic) |

The other 73 first-round probes bite or survive exactly as they did before. The 4 controls survive. SC16 and
SP09 are equivalent mutations and survive, as before.

**New probes on the round's own changes:**

| probe | mutation | caught by |
|---|---|---|
| N01-N06 | a review-round row deleted; a null row given a category; a null row's `category_note` removed; a new row loses 191; the security row moved to `app.audit_logs`; `_what` loses "complete against those sources ONLY" | T2, every one |
| N09-N14 | `check_narrowings` drops `error_code`; invents `workspace_id`; relabels one entry; F15 declared true; `check_narrowings` deleted; the divergence deleted | T3, every one |
| N15-N18 | in 140: actor_id CHECK loosened to `length()`; error_code CHECK removed; a new `reason_key_not_blank`; causation_id CHECK loses its null branch | T3, every one |
| N19, N20 | a quoted `"details" jsonb` column; a `numeric(10,2)` column, both in 140's body | T3 |
| N23, N24, N29 | later `ALTER TABLE IF EXISTS ONLY "app"."security_events"`; unqualified `alter table audit_logs`; an ALTER split over lines with a comment | T3 (plus generic) |
| N25, N26 | later `create policy ... on app . "audit_logs"`; unqualified `on audit_logs` | T1 (plus generic) |
| N27 | later policy on `app.audit_logs_archive` | not T1, which is correct; generic tests only |
| N31, N32 | `open_blockers[33]` loses "(F15) 140's not-blank CHECKs"; `[191]` loses the "OWED TO A0" sentence | T3; T2 |
| N33 | `invalid-category-schedule.json`'s category set to `rights` | T4 |
| N35 | the ERD's `## 8.` heading renamed | T2 (the slice-length guard) |
| **N07** | `_shape` gains `producer`, and a row gains `producer`, in one file | **nothing** (Q0-R1) |
| **N08** | a non-null row gains a `category_note` | **nothing** (Q0-R5, INFO) |
| **N21**, **N22** | a column in 140's body indented by 4 spaces or a tab | **nothing** (Q0-R5, INFO) |
| **N28** | later `drop table app.audit_logs; create table app.audit_logs (id uuid primary key, details jsonb);` | **not T1-T4**; generic tests only (Q0-R2) |
| N30 | later dynamic `execute format('alter table %I.%I ...')` | not T1-T4; generic only. This is the declared limit (`open_blockers[191]` (9)). |
| **N34** | the ERD's `## 9.` heading renamed | **nothing**: the slice silently runs to the end of the file (Q0-R5, INFO) |
| **N36** | `_shape.batch` reverted to the old text (C0 G4) | **nothing** (Q0-R3) |
| **N37** | the audit row's `why` loses "RE-CONFIRMED WHEN Q141-a IS ANSWERED" (A1 R1) | **nothing** (Q0-R4) |

**Vacuity.** The new checks do not pass on empty or missing input:

- An empty or deleted `check_narrowings` fails (N13), because the both-directions comparison requires the
  five not-blank CHECKs to be named.
- A lost `## 8.` heading fails (N35) on the slice-length assertion.
- `columnsOf` now reads every two-space column line. The pinned tripwire spellings are asserted to match
  (`foundation-contract.test.mjs:3351-3356`, `:3595-3598`), so a regex narrowed to nothing fails.
- The only quiet edge is N34. A lost end heading widens the slice and does not empty it.

**Each invalid fixture still fails for exactly its stated reason.** T4 asserts exactly one error with the
expected prefix (FX02, FX04 bite). It now also pins the category of the two F6 fixtures (FX05, N33 bite).

## 3. Claims checked

True as written:

- **A0's done list.** It cherry-picked the three reviews `-x` without conflict, and the diffs are identical. The
  coverage map has 20 rows, and the 11 added rows have the ids named. 7 of them are `category: null` with a
  `category_note`. The other 4 have categories `delete`, `delete`, `role` and `billing`. `check_narrowings` holds
  five columns, and the divergence `ids_not_blank_narrows_min_length` is undeclared. F3 is reworded in
  `store-conformance.json`, `open_blockers[33]`, plan §5 and the handoff. `_shape.batch` is amended. Both
  CARRIED `why`s carry the re-confirm sentence and the `open_blockers[32]` sentence. The tripwire regexes and
  their pinned spellings are present. `columnsOf` reads any type. The floor is 633 and the digests are 88.
  The PR is still Draft and not merged.
- **Blockers.** Against `c5a648e`, only `[33]` changed and `[191]` is new (192 blockers). Main's `[33]` is still
  an exact prefix, so the round edited only text this branch had appended. `[191]` grows by an append, (5) to
  (9). `[33]` now holds F15 and the widened F6.
- **Commit messages.** `cc00ccc`: 613 -> 633, with no test added or renamed. `9be87ca`: "20 added, 8
  modified, 0 deleted" for `c5a648e..f8f1320` (`git diff --name-status` gives 20 A, 8 M). The four test lines
  are right.
- **Handoff.** "23 paths at b99218e; 28 at f8f1320" is true, and it closes my Q0-F7. The criterion and evidence
  lines match the tree.
- **Plan §4 C0 N1 correction.** The identity-isolation citation is right.
- **Plan §7.2's "measured" column.** For every row I re-probed, the column is true: CM22, CM23, CM25, FX05,
  MG03, MG04, MG05, MG11, C0's not-blank cases and the unqualified policy all bite. Two rows say only "read",
  with "T1 still asserts Q141-a" (A1 R1) or "make db-schema-lint exit 0" (C0 G4). They do not claim a test holds
  the new text, and N36 and N37 confirm none does. The plan states this honestly. It is recorded below as a
  gap, not as a false claim.
- **Owner decisions.** Q141-a, Q141-b and Q141-c are still UNANSWERED. Every coverage-map row still says
  `UNDECIDED`. No migration, policy or grant is added (no path under `db/foundation/migrations/` changes against
  `c5a648e`).

I found no false claim.

## 4. Findings

My first round's findings: **Q0-F1 to Q0-F7 are all closed**, each measured above (Q0-F7 by the handoff's
qualified count).

New findings from this round:

| id | grade | finding | file:line | remedy |
|---|---|---|---|---|
| Q0-R1 | LOW | The closed key set of Q0-F4 is built from `_shape`'s own keys, so the map can open it itself. Adding `producer` to `_shape` and to a row in the same file passes (N07). Q141-a's decision could then appear in a lint file as a documented field. A reviewer would see the `_shape` edit in the diff, so this is not quiet, but it is not a test failure either. | `test-kits/db/foundation-contract.test.mjs:3386` | Pin the row key set as a literal in the test (the nine `_shape` keys plus the three notes), and assert `Object.keys(map._shape)` equals the nine. |
| Q0-R2 | LOW | The later-migration tripwire covers `create policy` and `alter table`. A later `drop table` plus `create table app.audit_logs (... details jsonb)` changes the store's columns, and no batch-141 test notices (N28). Today the generic new-migration snapshot tests fail first, as they do for every new migration. This is the same class as `open_blockers[191]` (9), which names only policy and ALTER. | `test-kits/db/foundation-contract.test.mjs:3300`, `:3590-3594` | Extend the scan to `(drop\|create)\s+table` (and `rename`) on either audit table, and pin the spellings; or name drop/recreate in `[191]` (9) beside dynamic EXECUTE. |
| Q0-R3 | LOW | C0 G4's change, the amended `_shape.batch` sentence, is held by no test. Reverting it to "the migration batch that classified it" passes lint and every test (N36). The finding it fixes therefore can return without a failure. | `db/foundation/lint/service-policy-map.json:13`; `test-kits/db/foundation-contract.test.mjs:3321-3357` | In T1, assert `_shape.batch` mentions `open_blockers[191] (8)` or "owns the cell". |
| Q0-R4 | LOW | A1 R1's change, the sentence in each CARRIED row's `why` that it is re-confirmed when Q141-a is answered and owes the `open_blockers[32]` scope-path check, is held by no test. T1 asserts only `Q141-a` in `why`, and that also appears earlier in the text. Dropping the sentence passes (N37). | `test-kits/db/foundation-contract.test.mjs:3334` | Assert `/RE-CONFIRMED WHEN Q141-a IS ANSWERED/` and `/open_blockers\[32\]/` on both rows. |
| Q0-R5 | INFO | Three edges that do not matter today. (a) N34: if the ERD's `## 9.` heading is renamed, `indexOf` returns -1 and the slice runs to the end of the file, so a cell after §9 would pass. (b) N21/N22: `columnsOf` sees only two-space-indented column lines. 140 is integrated and cannot be rewritten, and later columns are covered by the ALTER scan, so this is moot. (c) N08: a non-null row may carry a `category_note` that nothing reads. | `foundation-contract.test.mjs:3382`, `:3314` | (a) Assert `erd.indexOf('\n## 9. ') > erd.indexOf('\n## 8. ')`. (b), (c): none needed. |

Equivalent mutations, not findings: SC16, SP09. Declared limits, not findings: N30 (dynamic EXECUTE,
`[191]` (9)) and N27 (a near-miss name, correctly not T1).

## 5. Stop-the-line verdict

**No stop-the-line.** The round adds no migration, policy, grant or role. Every changed file is lint data, a
fixture pin, a static test or a record. Nothing introduces a secret, a tenant leak, a migration divergence, a
duplicate side effect or a contract mismatch. F15 is an existing narrowing in integrated 140. It is now pinned
and owed to Q141-b, not created.

**Q0 findings that block the merge: none.** Q0-R1 to Q0-R4 are LOW. Each is a test that does not yet hold a
sentence or a shape the round wrote. Q0-R2 is the one I would want closed before batch 141 writes its
migration. Whether to merge is not mine to decide. The C0 and A1 re-checks are separate runs, and the
Integration Owner's evidence and RFC-2026-025 §5's points stay owed, as the disposition says.

## 6. Limits

- Static only, with no live DB round, for the reason in §1.
- The probes exercise `foundation-contract.test.mjs` and `make db-schema-lint`, not a full `npm run check` for
  each probe. The full suite ran once, unmutated, through `npm run verify` on the branch name.
- The branch-name runs used `git symbolic-ref` on this worktree at the same SHA (see the header). That reads
  the same name through `git rev-parse --abbrev-ref HEAD`.
- A0's own 21 probes were counted, not re-run. My 118 probes overlap them and are independent of them.
- Owner decisions are read from the repository, not from the Owner's chat.
- Same vendor and model family as the Author (§0).
