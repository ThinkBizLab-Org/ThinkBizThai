# C0 contract review re-check: batch 170's review round

| Field | Value |
|---|---|
| Run | `/claude/c0_contract_reviewer` |
| Role | Independent Reviewer (contract), work package `WP-0A-DB-00`; narrow re-check |
| Subject branch | `agent/claude/WP-0A-DB-00-batch-170` (PR #175, Draft) |
| Subject head | `1c3e11dfd793b3420c96ec9a7ba08ab5c3ac5ac0` (handoff refresh, alone), over code `f728eca189cc3b4193211643f420359b5a92e89f` |
| Previously reviewed head | `ff13fafe0714699da3eb2b173b89a0ce4480e6e3` (my review: `c0-batch-170-contract-review-2026-10-03.md`, cherry-picked as `996e24e`) |
| Base | `9a07459` (`main`) |
| Author | `/claude/a0_atlas` |
| Date | 2026-10-04 (file name carries the phase date, 2026-10-03) |
| Reviewed in | local branch `recheck/c0-batch-170`, created at `1c3e11d` in my worktree. The guards that read the branch name (R1-R3) were run with the subject branch NAME checked out (`git checkout --ignore-other-worktrees agent/claude/WP-0A-DB-00-batch-170`, local ref and `origin/` both `1c3e11d`, nothing written); I switched back to `recheck/c0-batch-170` before any mutation, round or write. |
| Scope | `git diff ff13faf..1c3e11d` (the round), read against `git diff 9a07459..1c3e11d`; plan §9 and the lines it changed; disposition §2; manifest rationale and `open_blockers[195]` (8)/(10); the handoff; the RFC batch disposition §5, §7, §8; `scripts/db/generate-pinned-grants.mjs:58,63`. |

This document records review findings. It advances no status, approves nothing, and signs nothing on
anyone's behalf.

## §0 What I am

- A subagent **spawned by the Author run `/claude/a0_atlas`**, in a worktree and under a brief A0's
  workflow wrote; A0 chose the questions.
- The **same vendor and model family** as the Author (Claude). RFC-2026-024 withdrew the cross-vendor
  condition; it is still a real limit on independence.
- Whether this file counts as the Reviewer signature RFC-2026-002 requires is the **Integration Owner's
  and the Product Owner's** act, not mine. I accept no Owner question (Q-026-5, Q-027-5, Q-027-6) for
  any role.

## §1 Verdict

My three earlier INFO findings are handled as A0 says: C0-170-1 and C0-170-2 are fixed in wording, C0-170-3
is honestly recorded as owed (the generator writes that text, `generate-pinned-grants.mjs:58,63`, verified).
The round changes no statement of 170 (comment lines only, measured), so 170 remains the correct forward
change I found on `ff13faf`: no integrated migration edited, one column revoked from one role, every pin,
case and list moved legitimately; it matches Q-026-5 / Q-027-5 and ERD §11.4, and the record stays honest
that nothing writes `lifecycle_state` until the §11.4 command. Every round claim I checked is true, with
one overstatement: the new static assertion's message (and the commit, plan and blocker wording) says the
do-block "runs no DDL, DML, dynamic SQL or setting", but a `select set_config(...)` or a `select` of a
side-effecting function inside the block passes it (C0-170R-1, LOW). **No stop-the-line. Nothing I found
blocks the merge.**

## §2 Measured vs read

### 2.1 Measured (by me, this run)

Node `v24.20.0` (`/Users/bank/.local/node-v24.20.0/bin`, `node -v` before every measured run; the PATH Node
26 not used). PostgreSQL 17.11 (`/opt/homebrew/bin`), port **5505** on 127.0.0.1, TCP only
(`-c unix_socket_directories=''`), `initdb --locale=C -A trust -U postgres`, `LC_ALL=C`, shim first,
re-initdb every round. Private directory `c0-170r2/` in the session scratchpad. Cluster stopped and data
directory removed after every round; 5505 not listening at the end.

| # | command / round | head, branch | exit | result |
|---|---|---|---|---|
| R1 | `node scripts/verify-branch-scope.mjs 9a07459 WP-0A-DB-00` | `1c3e11d` on `agent/claude/WP-0A-DB-00-batch-170` | 0 | "all 17 changed path(s) are declared, and every amendment explains one" (14 on `ff13faf` + the three cherry-picked reviews) |
| R2 | `npm run check:handoff` | same | 0 | "describes the branch: nothing substantive after its cited head" (handoff cites `f728eca`) |
| R3 | `npm run verify` | same | 0 | "clean: exit 0 — tests 684, pass 684, fail 0, skipped 0, todo 0" (the floor 946 holds; the guard counts the four new call sites) |
| R4 | static: `git diff -U0 ff13faf f728eca -- db/foundation/migrations/`, non-comment changed lines | — | — | none: 170's change in the round is `--` lines only. `git diff --name-status 9a07459 HEAD -- db/foundation/migrations`: `A 170_…` only |
| R5 | `open_blockers` ff13faf vs head (node, parsed JSON) | — | — | 196 entries both sides; only `[195]` differs; its text before (8) and its (9) are byte-identical; (8) edited in place, (10) appended. Top-level keys changed: `open_blockers` and `ownership` (only `amends_without_owning.rationale`). Manifest is 459 lines both sides, so the 255+i line pins are unmoved |
| R6 | mutations of 170, `node --test test-kits/db/foundation-contract.test.mjs`, restored each time (sha256 prefix `9a2dbb97718920f8` before and after) | `1c3e11d`, `recheck/c0-batch-170` | — | unmutated 0. Appended `create or replace function`, `create view`, `create rule`, `alter default privileges`: each exit 1 on "and outside it only the revoke and the column comment, in that order". `execute 'grant update …'` inside the block: exit 1 on "the do-block, literals blanked, runs no DDL, DML, dynamic SQL or setting". **My own two:** `select set_config('search_path', 'x', false) into offending;` inside the block: **exit 0**; `select private.anything() into offending;` inside the block: **exit 0** (C0-170R-1) |
| R7 | r1: shim, `make db-migrate-clean`, `make db-rls-smoke` | `1c3e11d` | 0, 0 | "applied 170_workspace_lifecycle_not_client_writable.sql"; "post-migrate pass: 51 apply-time blocks, 39 re-run as written, 12 superseded and replaced"; "1087 isolation case(s) passed"; authz proofs ok |
| R8 | r2: fresh cluster, the same | `1c3e11d` | 0, 0 | same counts |
| R9 | drift d1: `grant update on app.workspaces to authenticated;` appended to `140_audit.sql` | `1c3e11d` | 2 | "170_workspace_lifecycle_not_client_writable.sql: a client role can write app.workspaces.lifecycle_state: authenticated UPDATE (P0001)" — the block still fires after the comment edit |
| R10 | `140_audit.sql` sha256 prefix around every round | — | — | `2ac596bb950e8dfb` before and after; `git status` clean after every round |

### 2.2 Read, not measured

- A0's rounds on 5507 (`a0-170r2/`) and its five mutations: I reproduced the five (R6), not its rounds.
- Q0's measurement behind Q0-F2's comment ("the pinned grant probe … stops the run first while the pin is
  unchanged … this block … fires once the pin has moved too"): the comment speaks of a **later file**; Q0's
  M1/M1c measured it with a `171_` file. I did not add a later migration file (drifts go to 140 only), so
  that sentence is read. R9 is the 140-site case, where 170's own apply catches it first, which the comment
  does not contradict.
- The Owner's words and their transcription (RFC batch disposition §7 row Q-026-5/Q-027-5, line 131: "now
  in the **first** of batch 170's migrations"; §8 line 170; §5 row Q-027-6, line 105). Read, not heard.
- CI on `1c3e11d` and PR #175's body: not looked at.

## §3 The questions

### 3.1 Is 170 a correct forward change?

Yes, unchanged from my review of `ff13faf`. The round touched no statement (R4); R7-R9 reproduce the same
apply, counts and block behaviour. The new static assertions are a legitimate tightening: four call sites,
floor 942 → 946, no test added or renamed (684, R3), integrity manifest regenerated for exactly the two
changed files (`scripts/test-suite-contract.mjs`, `test-kits/db/foundation-contract.test.mjs`).

### 3.2 Does it match Q-026-5 / Q-027-5 as answered and ERD §11.4?

Yes. The round makes the attribution match the record: the number now rests on the §7/§8 "first of batch
170's migrations", and Q-027-6 — the gate migration's number, "landing after approval and before any batch
that relies on the gate" (§5 line 105) — is recorded as **Not this batch**, the Integration Owner's. That
closes C0-170-2. The plan's quotation "the first of batch 170's migrations" is the §8 text verbatim and the
§7 text with its bold removed; immaterial.

### 3.3 Is the record honest that no writer exists until the §11.4 command?

Yes. (9) of `open_blockers[195]` is byte-identical (R5); the handoff's known limitations add C0-170-1's
membership note, which is what I measured on `ff13faf`. (10) states what was fixed and what is owed, and
says "not stop-the-line" for the owed items, which matches my grading.

### 3.4 Are the round's claims true?

| Claim (source) | Verdict |
|---|---|
| Branch checked out by name, files equal `ff13faf` byte for byte (A0 report, plan §9) | Not re-measured (A0's worktree); consistent: `ff13faf` is the parent chain of `1c3e11d` |
| Cherry-picks C0 49bcb9b→996e24e, A1 96caa2c→a18670e, Q0 6af2fb0→323baf7, with `-x` (commit messages, plan §9.1) | True: `323baf7`'s message carries "(cherry picked from commit 6af2fb0…)"; my own file at `996e24e` has the same blob as at `49bcb9b` (`e8161be`) |
| A1 F170-2 fixed by four assertions; the old kept; five mutations red; floor 946; 684 tests (`f728eca`, plan §9.2) | True (R3, R6). **But** "runs no DDL, DML, dynamic SQL or setting" overstates the assertion (C0-170R-1) |
| Q0-F1 / C0-170-2 corrected in 170's header, disposition §2, plan line 16 and §1 item 3, manifest rationale, `[195]` (8); recorded in (10) | True (read; R5 confirms where the manifest changed) |
| 170's diff is comment lines only (plan §9.2, commit) | True (R4) |
| `_how_measured` written by the generator at lines 58 and 63 | True (`generate-pinned-grants.mjs:58` pinned-grants, `:63` the exceptions file) |
| commit-when-clean 0 (684/684), refresh, handoff last and alone (`1c3e11d`) | True as far as R2 and R3 measure: the handoff cites `f728eca` and nothing substantive follows it |
| scope 17 paths (handoff tests) | True (R1) |
| No drift re-run this round | True and acceptable for a comment-only change; I re-ran d1 (R9) |

## §4 Findings

My earlier findings first:

| ID | Then | Now |
|---|---|---|
| C0-170-1 (INFO) | 170's block does not see a NOINHERIT membership | **Closed** by the comment at `170_…sql:86-89` |
| C0-170-2 (INFO) | Q-027-6 cited for 170's number | **Closed** (§3.2) |
| C0-170-3 (INFO) | `pinned-grants.json:3` says "through 140" | **Owed, recorded** (`[195]` (10), plan §9.2, handoff). The reason is true (the generator owns the text). Still INFO |
| C0-170-4 (INFO) | no §11.4 writer until the command | Unchanged, held on `[195]` (9) |

New:

| ID | Grade | Where | Finding | Remedy |
|---|---|---|---|---|
| C0-170R-1 | LOW | `test-kits/db/foundation-contract.test.mjs:3331-3332` (and the same wording at `:3325`, `scripts/test-suite-contract.mjs:224`, commit `f728eca`, plan §9.2, `open_blockers[195]` (10)(b)) | The keyword deny-list, applied to the do-block with literals blanked, does not see a function **called through `select`**: `select set_config('search_path', 'x', false) into offending;` and `select private.anything() into offending;` inside the block each pass the file (R6, exit 0). So "runs no DDL, DML, dynamic SQL or setting" and "issues no statement of its own beyond reading the catalog" are stronger than what is asserted. Not a defect of 170 itself (its block calls only `string_agg`, `format`, `unnest`, `has_column_privilege`, `has_table_privilege`, `coalesce`, and `raise`), and after merge 170 is an integrated migration that may not be edited anyway. | Either narrow the wording to "no statement keyword" in the next touch, or replace the deny-list with an allow-list of the function names the block calls (the six above, plus `pg_catalog.` qualification), which `set_config` and any `private.`/`app.` call would then fail. Not required before this merge. |

No CRITICAL, HIGH or MEDIUM finding.

## §5 Stop-the-line

**No stop-the-line.** The round changes no statement; no secret, tenant leakage, duplicate side effect, lost
job, migration divergence, irreversible deletion or contract mismatch is introduced. **Nothing I found
blocks the merge.** Whether the RFC-2026-002 / RFC-2026-025 bar is met (green required CI on `1c3e11d`, A1
and Q0 re-checks, Integration Owner evidence) is not mine to judge.

## §6 Limits

- Same vendor and model family as the Author, spawned by the Author's workflow (§0).
- Narrow: I re-read only the round's diff and the records it touched; the rest rests on my `ff13faf` review.
- No large harness, no CI read, no `main` checkout; the lifecycle forms were not re-run (no statement
  changed).
- Drifts only in `140_audit.sql`, and only d1; the later-file layer ordering in 170's new comment is read
  from Q0, not measured by me.
- Measured on the clean set with the CI shim, not on the provisioned instance (170 is declared not applied).
- The subject branch name was checked out for R1-R3 only, same SHA, nothing written; this file is
  committed on `recheck/c0-batch-170`.
