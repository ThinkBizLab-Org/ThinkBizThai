# C0 contract review: batch 123, the updated_by UPDATE closure on all seventeen tables, decided_by as a pair, and RFC-2026-025

| | |
|---|---|
| Run | `/claude/c0_contract_reviewer` |
| Role | Independent Reviewer (contract), WP-0A-DB-00 |
| Subject | branch `agent/claude/WP-0A-DB-00-batch-123`, head `5856f0b`, base `e276c9a` (main, merge of PR #161); Author `/claude/a0_atlas` |
| Date | 2026-09-28 |

This file records findings. It advances no status, approves nothing, and signs nothing on anyone's
behalf. Whether it counts as the Reviewer signature is for the Integration Owner and the Product
Owner to decide.

**The subject is `5856f0b` and nothing later.** While I reviewed, the subject branch moved to
`10d4a2a` ("docs(decisions): RFC-2026-025 approved by the Product Owner", committed 12:09 +0700).
I read that commit because it bears on question 4, and I record what I read in §4. I did not
review or measure it, and this file does not cover it.

## §0 What I am

- I am a subagent spawned by `/claude/a0_atlas`, the Author of the work under review.
- I ran in A0's worktree, under A0's brief.
- I am the same vendor and model family as the Author.
- RFC-2026-024 withdrew the cross-vendor condition. That removes one objection. It does not make me
  independent of the brief I was given.
- Accepting this file as the Reviewer signature is an act of the Integration Owner and the Product
  Owner, not mine.

## §1 How I measured

"Measured" below means I ran it. "Read" means I read the file or record and did not execute anything.

- **Checkout.** The subject branch is checked out in the main checkout, so I checked out `5856f0b`
  in my worktree as `review/c0-batch-123`. This file is committed there.
- **Branch name.** An unclaimed branch name makes the handoff guard return early. To measure on the
  branch name, I cloned the repository into my private directory
  (`scratchpad/c0-123/clone`), checked out `agent/claude/WP-0A-DB-00-batch-123` there, reset it to
  `5856f0b`, and set `main` to `e276c9a`, which is GitHub's `main` (`git ls-remote`). The subject
  branch is not on GitHub yet.
- **Static checks, on the branch name (measured):**
  - `npm run verify`: exit 0, tests 671, pass 671, fail 0. The same on `review/c0-batch-123`.
  - `node scripts/verify-branch-scope.mjs e276c9a WP-0A-DB-00`: exit 0, "all 24 changed path(s) are
    declared, and every amendment explains one".
  - `node scripts/verify-test-coverage-floor.mjs`: exit 0.
  - `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-DB-00.json`: exit 0.
  - `npm run scan:secrets`: exit 0.
  - `git diff --name-status e276c9a 5856f0b -- db/foundation/migrations/`: one file added (`A 123_…`),
    none modified. No integrated migration was rewritten.
- **Live database (measured):**
  - Setup: a private cluster in `scratchpad/c0-123/`, `127.0.0.1:5505`, TCP only
    (`unix_socket_directories=''`), `initdb --locale=C -A trust -U postgres`, `LC_ALL=C`,
    PostgreSQL 17.11 (Homebrew).
  - The shim went first. Every round started from a fresh initdb.
  - Drifts were APPENDED to the clone's `140_audit.sql`. After each round the file was restored and
    its sha256 checked (`2ac596bb950e8dfb…`, unchanged).
  - One probe edit went into the clone's `scripts/db/run.mjs` (D7). That file was restored and its
    sha256 checked too (`d2f5d8e38bd80ee3…`). `git status` in the clone was clean at the end.
  - `:5432` and `:5499` were not touched. The cluster was stopped and removed.
- **Round 0 (clean head, measured):**
  - `make db-migrate-clean`: exit 0.
  - The closure text probe: "14 updated_by INSERT, 17 updated_by UPDATE and 2 requester closures in
    their exact text on their pinned tables (self-test: refused its drift)".
  - The post-migrate pass: "44 apply-time blocks, 34 re-run as written, 10 superseded and replaced".
  - `make db-rls-smoke`: exit 0, "977 isolation case(s) passed".
  - The catalog measurements (M5–M10) and the forging measurements (M1–M3) ran on this database with
    fixtures loaded. Each forging measurement ran in a transaction that was rolled back.

| Round | Drift | migrate-clean | 123's block, fed by hand on the drifted database |
|---|---|---|---|
| D1 | `grant update (updated_by) on app.workspace_member_scopes to authenticated` | exit 2, probe: "updated_by is client-updatable on table(s) with no pinned UPDATE closure: app.workspace_member_scopes" | raised "…without batch 105's exact restrictive UPDATE closure…: app.workspace_member_scopes" |
| D2 | new table `app.c0_new_table`, RLS on and forced, `grant update (updated_by)`, a permissive UPDATE policy WITH CHECK `updated_by = (select auth.uid()) and …` (105's rule would have accepted it) | exit 2, probe names `app.c0_new_table` | raised, names `app.c0_new_table` |
| D3 | `drop constraint approval_requests_decider_is_a_pair` | exit 2, post-migrate pass: "123_attribution_closures_everywhere.sql#1 (line 73) no longer holds … approval_requests_decider_is_a_pair is missing…" | raised the same |
| D3b | D3, then `make db-rls-smoke` | – | smoke FAILED 1 of 977: `editor-a-cannot-cancel-an-approval-request-naming-a-decider` "the database accepted the row (1 returned) and had to refuse it with 23514" |
| D4 | `alter policy content_items_updated_by_on_update_is_caller … with check (updated_by = (select auth.uid()) or true)` | exit 2, probe: "updated_by_on_update_is_caller closure(s) not in their pinned shape … content_items…" | raised, names `app.content_items` |
| D5 | a looser permissive sibling `c0_loose_update on app.content_items for update to authenticated using (true) with check (true)`, 123 intact | **exit 0** | passed |
| D5 smoke | D5, then `make db-rls-smoke` | – | FAILED 2 of 977: `approver-a-cannot-rename-a-content-item` and `viewer-a-cannot-rename-a-content-item` (role widening, not updated_by) |
| D6 | coverage rule silenced in the clone's run.mjs (`and false`), plus D1 | exit 2, post-migrate pass names 021#1, 105#1 and **123#1** | raised |
| D7 | coverage rule silenced, no DB drift | **exit 0**, "closure text probe: … (self-test: refused its drift)" | passed. `node --test test-kits/db/foundation-contract.test.mjs` exit 1: probe digest `4df675142e576c55` ≠ pinned `caec5674e583d3cc` |

**Forging measurements on round 0 (measured).** In the rows below, `owner` is owner_a, `editor` is
editor_a and `approver` is approver_a, all from the fixture catalog.

| # | Statement | Result |
|---|---|---|
| M1a | editor cancels `approval_request_a1` with `decided_by = approver`, with 123 | ERROR, violates check constraint `approval_requests_decider_is_a_pair` |
| M1b | editor cancels with `decided_at = now()` alone | ERROR, same constraint |
| M1c | owner cancels with `decided_by = approver` | ERROR, same constraint |
| M1d | editor cancels plainly (positive) | UPDATE 1 |
| M1e | approver approves, naming itself, with `decided_at` (positive) | UPDATE 1 |
| M1f | as M1a, with the pair dropped inside the transaction | **UPDATE 1**, `decided_by = approver` |
| M2a | looser permissive sibling on content_items, then owner sets `updated_by = editor`, with 123 | ERROR, violates `content_items_updated_by_on_update_is_caller` |
| M2b | as M2a, with 123's content_items closure dropped | **UPDATE 1**, `updated_by = editor` |
| M2d | a looser permissive sibling on EACH of the ten tables. The owner sets `updated_by = editor` on every row it reaches | all ten refused, each by its own `<table>_updated_by_on_update_is_caller`. The same UPDATEs naming the caller: UPDATE 6, 5, 2, 5, 2, 5, 5, 4, 5, 1 |
| M3 | looser permissive sibling on approval_requests. The owner approves, naming `decided_by = approver`, with 123 | **UPDATE 1** (see F6) |

**Catalog measurements (measured):**

- **M8.** Exactly seventeen relations hold `authenticated` UPDATE on `updated_by`, all in `app`, all
  `relkind r`, each with its closure. Seventeen closures exist by name, and all seventeen are in the
  exact shape.
- **M7.** `anon` and `PUBLIC` hold UPDATE on no `updated_by`. No view or other relkind in `app` has an
  `updated_by` column.
- **M5.** Seventeen tables grant `authenticated` INSERT on `created_by`. None has a restrictive
  policy that names it. All seventeen bind it in a permissive policy.
- **M6.** These are all the client-writable `*_by` columns:
  - `created_by`: INSERT, on 17 tables. No restrictive policy names it.
  - `decided_by`: UPDATE only. No restrictive policy names it.
  - `requested_by`: INSERT, restrictive on both tables.
  - `updated_by`: restrictive wherever it is granted.
- **M9.** Both CHECKs are validated. They deparse as the migration and the case expect.
- **M10.** The fixture's approval requests: one approved and one changes_requested, each with both
  columns set; four pending, with neither.

## §2 Answers to the brief's questions

### Q1. Does 123 match the Owner's items 2 and 3, and is the change of mechanism disclosed honestly and justified? Yes on both, with one note (F8, INFO)

**Item 2** ("the seventeen-table extension: do it"; disposition line 23): matched. Measured and read:

- `123_attribution_closures_everywhere.sql:33-62` creates ten restrictive `FOR UPDATE TO
  authenticated` policies with no USING. Their text is 105's (compared with
  `105_updated_by_on_update_is_caller.sql:31-51`).
- M8 shows all seventeen present and exact.
- The general rule (`:78-101`) now requires the closure by name, RESTRICTIVE, `polcmd = 'w'`, no
  USING, `polroles = {authenticated}` and an exact deparse. 105's rule (`105…sql:77-102`) only
  required that the text be *contained*.
- The table count is pinned (`:103-109`).
- M2a, M2b and M2d reproduce the Author's negative control and extend it to all ten tables.

**Item 3** (disposition line 24): matched in effect. The mechanism differs from the one the Owner
saw, and the change is disclosed.

- **What the Owner saw.** The summary line recommended "a restrictive closure that a cancellation
  names no decider".
- **What 123 does.** It adds a CHECK instead (`:64-66`).
- **Where the change is disclosed** (read):
  - the disposition, row 3: "A0 is recording the change of mechanism here, not hiding it";
  - the commit body, item 2;
  - the handoff, `assumptions[1]`.
- **Why the change is justified** (read and measured):
  - With 090's `approval_requests_decision_has_a_decider` (`090_approval.sql:330-332`), the pair
    `(decided_at is null) = (decided_by is null)` is logically equivalent to A1's remedy 1, which
    ties each column to the status on its own (`a1-batch-105-security-review-2026-09-27.md:263-264`).
    Write S for "the status is a decision", A for "decided_at is set" and B for "decided_by is set".
    The old CHECK says S = (A ∧ B); the new one adds A = B; together they give S = A = B.
  - A CHECK binds every writer, including a BYPASSRLS role or a future service path. A restrictive
    policy `TO authenticated` would bind only clients.
  - It refuses nothing that works today:
    - M1d and M1e are positives, and 977 of 977 cases pass;
    - every fixture row satisfies it (M10);
    - the service path on `approval_requests` is closed (092);
    - no function writes `decided_*`, and no contract or plan document names the columns (grep).
  - It makes 090's own stated intent true (`090_approval.sql:327-329`). A cancellation, a pending
    request and an expired request now carry neither column (M1a–c).
- **What it forbids that was legal before.** `decided_at` alone on a cancelled or expired row. 090's
  comment already says neither is a decision, so I read this as a correction, not a product change.
  - **INFO.** A future expiry job cannot stamp `decided_at` with an expiry time. Whoever writes the
    first `expired` mover should know.

### Q2. Replacement edits: additive, marked, pins strict, fails_with counts right? Yes (measured), with stale messages (F7, LOW)

- **Additive** (read): every edit in the six `.1.sql` files appends names to a pinned array or to an
  exclusion tuple list. Nothing is removed or loosened.
- **Marked** (read): each file gains a header line "SUPERSEDED BY 123 as well: …". Each edited line
  carries `-- SUPERSEDED BY 123` or `…, 123:`.
- **Pins are strict** (measured):
  - The arrays are compared with `is distinct from`, so equality is exact, not a subset.
  - Their order is by `polname`, which is type `name` with C collation, so it does not depend on the
    database locale.
  - The replacements pass on round 0.
- **fails_with counts are right** (read and measured):
  - 070: 5 → 7. 080: 12 → 14. 090: 9 → 11. 100: 10 → 12. Each is the old count plus that family's
    two new closures.
  - The post-migrate pass runs each ORIGINAL block and requires P0001 beginning with its `fails_with`
    (`scripts/db/run.mjs:495-496`), and round 0 passed "10 superseded and replaced". So all ten
    register entries were proven on the database, including 081 and 120, whose earlier failure
    messages are unchanged.

### Q3. Is the probe's coverage rule correct, and would it catch a new table granting UPDATE on updated_by without a closure? Yes (measured), with a self-test gap (F5, LOW)

- **Correct** (read): `scripts/db/run.mjs:199-210`.
  - It uses the same relation predicate as 123's general rule.
  - `has_column_privilege('authenticated', …)` covers a table-level grant, a column grant and
    grants inherited through PUBLIC.
  - The rule refuses any granting table not in `UPDATED_BY_ON_UPDATE_CLOSURES`. `closureRule` then
    requires every listed table to carry the exact closure, and refuses a closure-named policy on an
    unlisted table.
  - Together: every granting table carries the exact closure.
- **It catches the new-table case** (measured):
  - D2 is a new table with the binding 105's rule accepted. Both the probe and 123's block name it.
  - D1 grants the column on an existing unclosed table. Both catch it.
  - D4 widens a closure with `or true`. The probe catches it.
  - D6: with the probe silenced, the post-migrate pass still names 123#1, and also 105#1 and 021#1.
- **The README's "fails twice"** (`db/foundation/README.md` item 2) is true as two independent
  mechanisms (D1, D6). migrate-clean prints only the first, because the probe returns before the
  post-migrate pass runs.
- **What it does not cover** (measured today as empty, so a limit and not a finding):
  - roles other than `authenticated` (M7);
  - schemas other than `app` (M8);
  - views (M7b);
  - whether RLS is enabled and forced. 123's block checks that; the probe does not.
- **A looser sibling (D5).** A looser permissive sibling *beside* an intact closure survives
  migrate-clean. That is harmless for `updated_by` (M2a, M2d), which is the point of 123. Only
  rls-smoke's role cases catch the role widening it causes.

### Q4. RFC-2026-025: accurate, honestly Proposed, registration justified, and does "record-only" have a loophole?

- **Honestly Proposed at `5856f0b`** (read). Yes.
  - Its status line (`:3-6`) says "Proposed", "The Owner has not seen this text", and that approval
    "is not inferred from an instruction that preceded the text".
  - §4 is "Approve, amend or refuse".
  - Nothing in `5856f0b` acts on it. The manifest, the records and the handoff all say Proposed.
- **Registration is justified by the precedent** (read):
  - RFC-2026-024's commit `d7b12a6` registered an *In review* RFC in the same places. It added one
    line to `scripts/verify-test-coverage-floor.mjs` `DIGESTED_FLOOR` and one to
    `test-kits/repository-json.test.mjs` `DECISION_RECORDS`, regenerated the integrity manifest, and
    added the path to the manifest's `writable_paths`.
  - 123 does exactly that and declares both lists in `amends_without_owning` with a rationale.
  - It is also mechanically required. `repository-json.test.mjs` fails on any file under
    `architecture/decisions/` that is not declared, so a Proposed RFC cannot exist in the tree
    unregistered.
  - The commit says "two protected lists". The integrity manifest is a third, regenerated file.
    RFC-024's commit touched the same three.
- **Cited lines verified** (read):
  - `product-owner-disposition-2026-09-15-six-questions.md:186-188` carries the quoted sentence.
  - The sixth pass says "is NOT satisfied" at line 37, inside §1.
  - The seventh pass says it at line 46, inside §1a.
  - The eighth pass says it at line 26, inside §1.
  - The seven merges #155–#161 fall between 2026-09-27 and 2026-09-28. GitHub shows each merged by
    `workstationgroup` (measured through `gh pr list`).
- **Inaccuracies** (F4, LOW). They are about the claims of fact in §1, not about its citations.
- **The record-only definition has loopholes, and it does not fit its own precedents** (F1, MEDIUM).
- **The "that role run's own findings" clause lets unreviewed Author code merge** (F2, MEDIUM).
- **§3's "what it does not change" is incomplete** (F3, MEDIUM).

### Q5. Are the claims in the commit, the record, the README and the blocker edits true?

| Claim (where) | Verdict |
|---|---|
| "ten RESTRICTIVE UPDATE closures … a restrictive policy ANDs with whatever admits the row, so it cannot be widened" (commit 1; migration `:10-20`) | TRUE, measured (M2a, M2b, M2d) |
| "the closure-text probe pins all seventeen and refuses any table that grants the column without one" (commit; README) | TRUE, measured (D1, D2, D4) |
| "(Q0 F3: the rule is now live-probed)" (commit) | HALF TRUE. Live, yes. Q0's remedy also asked for the rule's own drift, and it has none (F5, D7) |
| "Measured: … an owner forges updated_by without 123 and is refused by 123's policy with it" (commit; ninth pass §3; handoff) | TRUE, measured (M2a, M2b) |
| "The new case fails without the constraint and passes with it"; "migrate-clean also names 123's block" | TRUE, measured (round 0, D3, D3b) |
| "A CHECK rather than a policy -- A1's own suggested remedy" (commit) | TRUE in substance. A1 offered two remedies, and this is remedy 1, in an equivalent form (Q1) |
| "Nothing that works today is refused" (migration `:18`; handoff) | TRUE, measured (977 cases; M1d, M1e; the M2d positives) |
| "migrate-clean 44 blocks, rls-smoke 977 cases"; "tests 70 -> 71, assertions 322 -> 330"; VERIFICATION.md 671 | TRUE, measured (the floors: the guard's static count. The new test adds 9 assertion call sites and 105's test loses 1) |
| "created_by at INSERT … on seventeen tables … bound only inside the permissive INSERT policy (measured 2026-09-28)" (blocker; README; handoff) | TRUE, measured (M5) |
| "two stale blockers annotated": RFC-2026-021 approved 2026-09-06, RFC-2026-022 approved 2026-09-08 and not in effect until §7 | TRUE, read (their status lines) |
| "188 blockers" | TRUE, read: 189 − 1 removed (decided_by). The other three edits replace text in place (four removed, three added) |
| "the decided_by blocker closed" | TRUE for what it named. It also owed "the same survey for every other *_by attribution column". The survey's second residual (decided_by at decision, M3) is not recorded (F6) |
| Disposition: "#161 … head 5dd2595 pinned, CI green" | TRUE, measured: CI run `36326908197` success on `5dd2595`; `e276c9a` push run `36379205005` success |
| Disposition row 3: A1's remedy is quoted as "split the constraint per column" | NOT VERBATIM. A1 wrote "Split the CHECK so that each column is tied to the status on its own" (F8, INFO) |
| Ninth pass §1: "#160 … and #161 …, both pressed by A0 on the Owner's words" | TRUE, but without the RFC-2026-002 caveat every earlier record carried (F9, LOW) |
| RFC-025 §1: "None of them changed schema, code, a test or a gate"; "Some of those cycles included three role runs of about 200k tokens each" | NOT ACCURATE and UNSUPPORTED (F4) |
| "Numbered 123, not 106: … a 106 draft failed on exactly that" | Not reproduced. It follows from the ordering: `publish_intents` is created in 120 |

### Q6. Ownership and floors: clean (measured)

- `verify-branch-scope.mjs e276c9a WP-0A-DB-00` exit 0 (24 paths). The six amended-without-owning
  files are declared, each with its reason.
- `writable_paths` gains the RFC-025 path, as RFC-024's commit did.
- The floors and the test-name digest pass the guard, and `npm run verify` is green on the branch name.
- **INFO.** The handoff at `5856f0b` cites `head = base = e276c9a` and has empty file lists. The
  guard accepts this (HEAD^ is `e276c9a`, so the drift is clean), and it is this repository's
  "handoff last and alone" pattern. It is not yet the handoff CONTRIBUTING_AGENTS.md asks for, which
  lists the changed files.

### Q7. Stop-the-line? None in `5856f0b`

- No integrated migration was rewritten.
- No secret was found (scan exit 0).
- No tenant boundary moved: the only new policies are restrictive and ANDed.
- No contract mismatch: no catalog contract or plan names `decided_*` (grep).
- None of CONTRIBUTING_AGENTS.md's stop-the-line classes applies.
- The governance observation in §4 about `10d4a2a` is not one of those classes either. I recommend
  that the Owner see it before any merge of this branch is pressed by delegation.

## §3 Findings

### F1: MEDIUM. RFC-2026-025 §2.3 "record-only" has loopholes, and does not fit the three PRs it cites as record-only (read)

`architecture/decisions/RFC-2026-025-owner-delegated-merge.md:45-49` defines a record-only PR as one
touching only:

- `evidence/**`;
- the package's handoff;
- the branch-slot lines;
- open-blocker text in the manifest.

Such a PR "may merge on green CI under a delegation" with no role runs.

1. **Its own precedents fall outside it.** #154 (`b07a8d9`), #158 (`9039738`) and #160 (`5922684`)
   each changed more of `work-packages/WP-0A-DB-00.json` than open-blocker text:
   - `ownership.branch`;
   - `ownership.amends_without_owning.paths`: #154 removed three entries and #160 removed two;
   - the `rationale`.

   A branch-slot move requires `ownership.branch` to change, so as written no record-only PR is
   possible. That leaves two readings. Either the definition excludes every PR it was written for,
   or it will be read loosely to include ownership fields. The loose reading lets an Author change
   its own package's ownership declaration with no review.
2. **`evidence/**` includes the files that record decisions and signatures.**
   - It covers `product-owner-disposition-*.md`, which record the Owner's decisions, and the role-run
     files (`c0-*`, `a1-*`, `q0-*`), which are the signatures.
   - A record-only PR could add or rewrite either and merge with no independent eye.
   - That includes a transcription of an Owner approval. The approval of RFC-025 itself, at
     `10d4a2a`, is exactly such a file.
   - The exclusion "a contract or decision document is not record-only" conflicts with `evidence/**`
     here. The text does not say which wins.
3. **"Open-blocker text" includes removing a blocker.** A security finding can be closed by a record
   alone, with no role run. 123 itself removes the decided_by blocker, correctly and with a
   measured fix. The rule would allow the same removal without one.
4. **Nothing enforces the class.** The Author classifies its own PR and then presses the button.
   `verify-branch-scope.mjs` checks that paths are declared, not that a PR is record-only.
5. **Mixed PRs are not addressed.** Consider record-only commits appended to an implementation PR
   after its role runs. `10d4a2a` is one: an RFC status change, a disposition, the handoff and a
   state record, added on top of the head the role runs were briefed on. Under §2.1, the role runs
   on `5856f0b` do not cover that head.

**Remedy.**

- Make the class a CI-enforced path allowlist.
- Exclude `product-owner-disposition-*` and the role-run file prefixes.
- Forbid blocker removal in a record-only PR.
- Either list `ownership.branch` and `amends_without_owning` explicitly, or drop "record-only" for
  PRs that move the slot.
- State the rule for mixed PRs.

### F2: MEDIUM. RFC-2026-025 §2.1 lets a post-review Author commit merge unreviewed (read)

**The clause.** `:40-41` requires every required role run "on that head, or on a head whose later
commits are that role run's own findings". The later commits are the Author's, not the role run's.
Findings are text; fixes are code.

**The precedent it codifies.** For #161:

- the role runs reviewed `4eb118e`;
- `f82a70d` then changed `105_updated_by_on_update_is_caller.sql` (22 lines),
  `tests/db/identity/isolation-cases.mjs` (57 lines) and a replacement;
- it merged without re-review.

The clause puts no bound on what a "findings" commit may contain.

**Remedy.** Either the role run whose finding a commit answers confirms the fixed head, or
post-review commits are limited to evidence and the handoff.

### F3: MEDIUM. RFC-2026-025 §3 does not name what §2.3 amends, and §2.1 leaves the Integration Owner ambiguous (read)

**§3 is incomplete.** §3 (`:53-59`) says the RFC does not change "the separation of duties in
`CONTRIBUTING_AGENTS.md`". But §2.3 removes, for a class of PRs, the per-merge evidence that two
documents require for *every* merge into `main`:

- `CONTRIBUTING_AGENTS.md` § "Temporary manual merge control", bullet 2: "linked Author, independent
  Reviewer, independent Tester, … and Integration Owner evidence";
- `RFC-2026-002` Decision 2.

An approved RFC outranks both in the conflict order, so the amendment would be valid. It should
still say what it amends.

**The Integration Owner is ambiguous.** §2.1 requires "every role run the package's gates require".
This package's gates include `integration_verified`, and its Integration Owner is `/claude/r0_steward`
(the manifest's `role_assignments`). I found no r0 evidence file in `evidence/WP-0A-DB-00/`. Either
every delegated merge so far lacked that gate, or the clause is being read as excluding it. §2.4's
"The role runs and CI do that [integrate]" does not settle which.

### F4: LOW. RFC-2026-025 §1's claims of fact are imprecise (read)

- **"The Owner's reading"** (`:18-20`).
  - The cited sentence sits under "Read:" in a file whose header says "Transcribed by
    `/claude/a0_atlas` … It decided nothing below" (`six-questions.md:11-12`).
  - It is A0's reading of the Owner's instruction, in a record the Owner's authority stands behind.
    It is not the Owner's own words.
- **"None of them changed schema, code, a test or a gate"** (`:30`). Each of #154, #158 and #160
  changed `test-kits/branch-identity.test.mjs`, in its slot lines, and the manifest's ownership
  fields (F1).
- **"Some of those cycles included three role runs of about 200k tokens each"** (`:29-30`). No
  role-run evidence file in `evidence/WP-0A-DB-00/` has #154, #158 or #160 as its subject. The
  seventh pass says #156 and #157 had none. The Owner approved on a summary of this motivation.

### F5: LOW. The new coverage rule has no self-test drift, so it is live and not proven able to fire on every run (measured)

**The self-test does not reach it.** The closure text probe's only self-test drift is an INSERT
closure (`scripts/db/run.mjs:331`). D7 silenced the coverage rule with `and false`. Measured
result:

- migrate-clean exit 0, still printing "(self-test: refused its drift)";
- only the static digest pin failed (`foundation-contract.test.mjs:2307`), and a same-change digest
  update satisfies it.

**What I proved.** D1 and D2 prove the rule fires today, and D6 proves 123#1 backs it up whenever a
violating grant exists. This is Q0's F3 on 105, half-answered: that remedy asked for "its own
drift, for example `grant update (updated_by) on app.workspace_member_scopes`" (D1 is that drift),
and "Give the UPDATE closure rule its own drift too"
(`q0-batch-105-test-review-2026-09-27.md:331-333`). Neither was added.

### F6: LOW. decided_by at DECISION is still bound only inside a permissive policy, the class 123 closes for updated_by, and the residual is not recorded (measured)

**The measurement.** M3: with a looser permissive UPDATE sibling on `approval_requests` and 123
applied, owner_a approved `approval_request_a1` naming approver_a as `decided_by`. Result: UPDATE 1.

**Why it passes.** The pair and the decider CHECK are satisfied. `decided_by = auth.uid()` lives
only in the permissive `approval_requests_update_decide_approver` (`090_approval.sql:584-595`).
M6 shows no restrictive policy names `decided_by`.

**Grade.** Not a regression, and nothing reaches it today. But the removed blocker owed "the same
survey for every other *_by attribution column". Its replacement records created_by at INSERT
(M5) and not this.

**Remedy.** Record it beside created_by, or add a restrictive UPDATE closure
`decided_by is null or decided_by = (select auth.uid())`.

### F7: LOW. Ten raise messages in the six edited replacements still name the old contributor lists (read)

Examples:

- `070_research.1.sql:34`: research_runs, "the ones no later file added";
- `070_research.1.sql:44`: "the ones 071 added";
- `080_content.1.sql:26,31`: "082, 102";
- `081_content_targets.1.sql:24`;
- `090_approval.1.sql:29,34`;
- `100_asset.1.sql:34,44`;
- `120_publisher.1.sql:38`.

105's edit to `030_industry.1.sql:121` updated its message ("102's and 105's updated_by
closures"). 123 did not follow suit. The pins are right. A failure would misattribute the extra
policy.

### F8: INFO. The disclosure of the decided_by mechanism is honest but lives mostly in A0's own transcription (read)

**Where it is.** The change is recorded in the disposition (row 3), the commit and the handoff. The
migration header (`:22-31`) and the ninth-pass record's §3 describe the CHECK but not that the
Owner saw "a restrictive closure".

**The quote.** The disposition's quotation of A1's remedy is not verbatim (Q5).

**What the Owner should be told.** The Owner approved "as you recommend", so tell the Owner in
session, in one line: the CHECK is stronger than what was recommended, and it binds non-client
writers as well.

### F9: LOW. The ninth-pass record states #160's and #161's merges without the RFC-2026-002 caveat (read)

**The gap.** `session-2026-09-28-ninth-pass.md:15` says "both pressed by A0 on the Owner's words".
Every record from the sixth pass on added that RFC-2026-002's literal sentence "is not satisfied".
At `5856f0b`, RFC-025 was Proposed, so the caveat still applied.

**Why it matters now.** `10d4a2a`'s RFC §4 says pre-approval merges "keep the caveat their own
records gave them". The record that covers #160 and #161 gives them none.

### F10: INFO, pre-existing, not introduced by 123. The RFC-2026-024 §0 disclosure rule no longer reaches the role files (read and measured)

**The rule.** The rule is in `test-kits/repository-json.test.mjs:165-175`. It matches role files by
the regex `^(a1-security|c0-review|q0-test)-…`.

**What it misses.** Since 2026-09-16 the role files have been named `a1-batch-*`, `c0-batch-*`,
`q0-batch-*`, `*-catalog-rule-probes-*` and `*-post-migrate-pass-*`. Twelve of them are not
checked, and neither is this file. A grep shows that each of the twelve contains the word the rule
looks for. So the gap is in the guard, not in the files.

## §4 Observed beyond the subject: `10d4a2a` (read, not measured, not reviewed)

The branch tip `10d4a2a` marks RFC-2026-025 **Approved**. It cites the Owner's `อนุมัติ RFC-2026-025`,
transcribed in the new `product-owner-disposition-2026-09-28-rfc-025.md`. Three things in it matter
to question 4, and the Owner should read them.

1. **A rule not in the approved text was added to the approved RFC's status line.**
   - The status line says "The approved text is this file as committed at `5856f0b`".
   - In the same line it adds: "A change that NARROWS the delegation … may be applied and reported
     to the Owner. A change that widens it needs the Owner again."
   - That clause is not in `5856f0b`.
   - §4 was also rewritten, from "For the Owner" to "In effect".
   - The disposition then cites "The RFC's own status line provides for changes after approval". The
     provision it cites was written by A0 in the same commit.
   - Deciding which edits are "narrowing" is a judgement, and the clause hands it to the Author.
   - I grade this **MEDIUM**: text was added to an approved governance rule without approval. It is
     not a stop-the-line class. It is for the Owner.
2. **What the Owner saw.** The disposition says that the Owner approved after a one-sentence summary
   and that "the record does not show whether he read the full text". That is honest. F1 to F4 are
   about text the Owner may not have read.
3. **"Do all the work" is being read as a stated sequence.** The disposition reads
   `คุณลุยงานทั้งหมด ตามที่คุณแนะนำ` as the §2.1 delegation "for the sequence it recommended:
   batch 123, then batch 091". Batch 091 is a PR that does not exist yet. This is §2.1's "stated
   sequence" in practice, delegated before the text it operates under existed.

Under RFC-025's own §2.1, a merge of this branch at `10d4a2a` or later would not be covered by role
runs on `5856f0b` (F1 item 5).

## §5 Limits

- **Independence.** The same vendor and model family as the Author, spawned by the Author, under
  the Author's brief (§0).
- **The one-page summary is not in the repository.** I could not check what the Owner saw on items
  2–4 beyond A0's transcription. I cannot verify any in-session Owner words.
- **Where it was measured.** Everything live ran on PostgreSQL 17.11 with the CI shim. Nothing ran
  against Supabase.
- **`10d4a2a` was read, not measured.**
- **Not reproduced:** the 106-draft failure, and the evidence of role-run cost.
- **Drift coverage.** My drifts cover the classes the brief named. They are not an exhaustive
  search of later-migration drift.
