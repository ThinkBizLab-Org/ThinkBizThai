# C0 contract review: batch 125 (`43f4d96`, handoff `d85a643`)

| | |
|---|---|
| Run | `/claude/c0_contract_reviewer` |
| Role | Independent Reviewer (contract), WP-0A-DB-00 |
| Subject | branch `agent/claude/WP-0A-DB-00-batch-125` (Draft PR #163): batch 125 `43f4d96` and the handoff commit `d85a643`; base `7f6cefb` (main, the merge of PR #162); Author `/claude/a0_atlas` |
| What 125 answers | the re-verification round on batch 123's corrections: mine (`c0-batch-123-corrections-reverify-2026-09-28.md`), A1's (`a1-batch-123-corrections-reverify-2026-09-28.md`), Q0's (`q0-batch-123-corrections-retest-2026-09-28.md`); and A1 F4 / Q0 F7 on batch 123 (`decided_at`) |
| Records under review | A0's `a0-batch-125-record-2026-09-28.md`; the Owner disposition `product-owner-disposition-2026-09-28-after-162.md` (A0's transcription) |
| Date | 2026-09-28 |

This file records findings. It advances no status, approves nothing, and signs nothing on anyone's
behalf. Whether it counts as the Reviewer's review of batch 125 is for the Integration Owner and the
Product Owner to decide.

## §0 What I am

- I am a subagent spawned by `/claude/a0_atlas`, the Author of the work under review.
- I ran in A0's worktree, under A0's brief. The brief said what to read and what to ask. I checked
  each claim it pointed at against the diff and the database, not against the brief.
- I am the same vendor and model family as the Author.
- RFC-2026-024 withdrew the cross-vendor condition. That removes one objection. It does not make me
  independent of the brief I was given.
- Accepting this file as the Reviewer's signature is an act of the Integration Owner and the Product
  Owner, not mine.
- This file's name is outside the pattern of the RFC-2026-024 §0 guard (my F10 on batch 123). It
  carries §0 anyway.

## §1 How I measured

"Measured" means I ran it. "Read" means I read the file or record and executed nothing.

- **Checkout.** The subject branch is checked out in the main checkout, so I checked out `d85a643` in
  my worktree as `review/c0-batch-125`. This file is committed there, and nothing else is.
- **Diff.** I read `git show 43f4d96` in full (17 files, +593/−157). `d85a643` changes only the
  handoff (+22/−3): its head becomes `43f4d96` and it lists the files. Its `files_added` and
  `files_modified` equal `git diff --name-status 7f6cefb 43f4d96` (measured).
- **Branch name.** An unclaimed branch name makes the handoff guard return early. I cloned the
  worktree into my private directory (`scratchpad/c0-125/clone`), put
  `agent/claude/WP-0A-DB-00-batch-125` at `d85a643` there, and set `main` to `7f6cefb`. `git
  ls-remote origin` shows `main` at `7f6cefb` and the subject branch at `d85a643`.
- **Toolchain.** `node -v` 24.20.0, npm 11.19.0, `.node-version` 24.20.0. PostgreSQL 17.11 (Homebrew).
- **GitHub (measured through `gh`, read-only).**
  - #162 is `MERGED` at 2026-09-28T08:41:23Z by `workstationgroup`. Its merge commit is `7f6cefb` and
    its head `e77f131`. The timeline has one `merged` event, at that time, by that account.
  - The `bootstrap` check run on `e77f131` succeeded (completed 08:16:47Z).
  - `7f6cefb`'s parents are `e276c9a` and `e77f131`. `e276c9a` is an ancestor of `e77f131`, and
    `7f6cefb` and `e77f131` have the same tree.
  - #163 is Draft, `OPEN`, head `d85a643`, merge state `CLEAN`. Run `36399350920` ("Bootstrap
    validation", `pull_request`) succeeded on `d85a643`. I did not read its steps.

**Static checks (measured):**

| Command | Where | Result |
|---|---|---|
| `npm run verify` | `review/c0-batch-125` | exit 0, tests 674, pass 674, fail 0 |
| `npm run verify` | the branch name, in the clone | exit 0, tests 674, pass 674, fail 0 |
| `node --test test-kits/handoff-conformance.test.mjs` | the branch name | "the handoff for this branch describes this branch" passes |
| `node scripts/verify-branch-scope.mjs 7f6cefb WP-0A-DB-00` | both | exit 0, "all 17 changed path(s) are declared, and every amendment explains one" |
| `node scripts/verify-test-coverage-floor.mjs` | the branch name | exit 0 |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-DB-00.json` | the branch name | exit 0 |
| `npm run scan:secrets` | the branch name | exit 0 |
| the guard's own counts (`stripNonCode`, `countDeclaredTests` and the assertion regex, imported from the guard) | the branch name | `foundation-contract.test.mjs` 72 tests, 365 assertions; `identity-isolation.test.mjs` 303 tests, 2144 assertions. Each equals its floor |

**Live database (measured).**

- **Setup.** A private cluster in `scratchpad/c0-125/`, on `127.0.0.1:5505`, TCP only
  (`unix_socket_directories=''`). Created with `initdb --locale=C -A trust -U postgres`, run with
  `LC_ALL=C`. The shim went first, then `make db-migrate-clean`, then `make db-rls-smoke` unless a
  row says otherwise. Every round started from a fresh initdb.
- **Drifts.** Each was APPENDED to the clone's `140_audit.sql`, which was restored after every round.
  Its sha256 was checked each time (`2ac596bb950e8dfb…`, unchanged).
- **Runner mutations.** Each edited the clone's `scripts/db/run.mjs` (restored after each, sha256
  `f501e3ab7151c3a0…` checked) or, for V4, `tests/db/identity/run-isolation.mjs` (restored by git).
- **End state.** `git status` in the clone is clean at `d85a643`. The cluster is stopped and removed,
  and nothing listens on `:5505`. `:5432` and `:5499` were not touched.

**Round 0, the clean head.** `make db-migrate-clean` exit 0, then `make db-rls-smoke` exit 0.

- **Eleven catalog-rule probes.** Every claim line ends "(self-test: refused …; clean again after
  every drift)". The drifts per probe are 2+1+1+1+1+1+1+1+1+2+4 = 16, so 38 jobs. The FK-support
  claim reads "4 exempt by name", and the coverage claim "among the 18 with a pinned closure
  (updated_by, decided_by)".
- **Post-migrate pass.** "45 apply-time blocks, 35 re-run as written, 10 superseded and replaced".
  The pass fails a register entry whose block no longer raises its `fails_with`. So 090's new
  `fails_with`, "batch 090 wrote 13 restrictive policies and it creates three tables to narrow", was
  matched live.
- **Isolation cases.** "990 isolation case(s) passed."
- **The closure.** Restrictive, `w`, `{authenticated}`, USING `(status = 'pending'::text)`, WITH
  CHECK `true`.
- **The trigger function.** `private.set_decided_at()` is not SECURITY DEFINER. Its `proconfig` is
  `{search_path=""}` and its `md5(prosrc)` is `c1564fa491fde66f5bf2e21b7c1efbfa`, the pin. It is
  owned by `postgres`, written in plpgsql, and neither PUBLIC nor `authenticated` holds EXECUTE on it.
- **Triggers on `approval_requests`.** `set_decided_at` fires before `set_updated_at` (name order).
  Both are enabled (`O`).
- **Client grants on `approval_requests`.** `status`, `decided_by` and `decided_at` are UPDATE-able
  and not INSERT-able. There is no DELETE grant and no permissive DELETE policy.
- **Attribution columns in `app`.** The client-updatable `*_by` columns are 17 `updated_by` and
  `approval_requests.decided_by`, 18 in all. The client-INSERTable ones are `created_by` on 17
  tables, `requested_by` on 2 and `updated_by` on 14.
- **Residue.** None. `pg_db_role_setting` is empty, no probe child table exists, and the append-only
  tables neither inherit nor are inherited from. `content_targets_social_scope_idx` and
  `billing_invoices_subscription_scope_fk` are present. `private.set_updated_at()` is still SECURITY
  DEFINER with `search_path=""`.
- **The FK-support drift reaches its rule.** `content_targets_social_scope_idx` is the only index
  that leads with `content_targets_social_scope_fk`'s columns, so dropping it really uncovers a key.

**Database drifts (measured).** "(1)" means exactly that one case failed.

| Round | Drift appended to 140 | migrate-clean | rls-smoke |
|---|---|---|---|
| D1 | A1's R3c: the decide policy's USING widened for the owner (`status = 'pending' or role = 'owner'`) | exit 0 | 990 of 990 |
| D2 | R3c, and the settled-row closure dropped | exit 2, pinned policy probe: as built, its drift (42704), and clean again | **(1): `owner-a-cannot-redecide-a-settled-approval-request`**, errored 23514 (the trigger refused it; no row landed) |
| D3 | the settled-row closure dropped alone | exit 2, pinned policy probe | 990 of 990 |
| D4 | the `set_decided_at` trigger dropped | exit 2, post-migrate pass: 125's block, "set_decided_at trigger is missing, disabled or not in its required shape" | 3 of 990: `…-naming-a-decider` ("refused with 23514 … but not by approval_requests_decision_has_a_decider"), `approver-a-cannot-backdate-a-decision`, `…-postdate-…` |
| D5 | the trigger function's body replaced by `return new`, its shape kept | exit 2, post-migrate pass: 125's block, "private.set_decided_at() is missing, rewritten, …" | the same 3 |
| D6 | Q0's E02c on `content_items`: 123's closure dropped, and a permissive sibling admitting owner and admin with no actor binding | exit 2, updated_by update closure probe | **(1): `owner-a-cannot-rename-the-content-item-of-a1-naming-another-updater`**, 1 row |
| D7 | a new table `app.c0_signoffs`: an FK to `workspaces` with its index, RLS enabled and forced, a client INSERT policy, `grant insert (workspace_id, approved_by)` | **exit 0** | 990 of 990 |
| D7u | D7, plus `grant update (approved_by)` (the control) | exit 2, coverage probe names `app.c0_signoffs.approved_by` | 990 of 990 |
| N10 | a new table with an FK to `workspaces` and no index | exit 2, FK-support probe names the key as built. Drift 2's self-test then reports rule 1's raise; it fails closed | not run |

**Rolled-back statements on the round-0 database (measured).** "Pending" is `approval_request_a1`.
"Decided" is `approval_request_a1_decided`, approved, with `approver_a` as its decider (read from the
database). "Sibling" is a permissive `using (true) with check (true)` UPDATE policy created in the
transaction.

| # | Statement | Result |
|---|---|---|
| T1 | the approver approves "pending" and sends `decided_at` 2001 | 1 row, `decided_at = now()` |
| T2 | the same with 2999 | `decided_at = now()` |
| T3 | the approver approves and sends no `decided_at` | `decided_at = now()`. Before 125 the pair refused this statement |
| S1 | a superuser backdates "decided" | ERROR, the trigger |
| S2 | a superuser reverts "decided" to pending, with no decider and no time | ERROR, the trigger |
| S3 | a superuser changes the decider of "decided" | ERROR, the trigger |
| S4 | a superuser updates only `updated_by` on "decided" | 1 row, the decider kept |
| S5 | a superuser flips "decided" from approved to changes_requested, without touching the decision columns | **1 row**, `decided_by` still the approver (F6) |
| S6 | a superuser, after `set local session_replication_role = replica`, backdates "decided" | **1 row**, 2001 (F6) |
| I1 | a superuser INSERTs an approved request with `decided_at` 2001 (a clean final round) | **1 row**, 2001 (F6) |
| R3c | under R3c, the owner re-decides "decided" as itself | 0 rows |
| R3c-a | the same with the closure dropped | ERROR, the trigger |
| R3c-b | the same with the closure and the trigger dropped (the control) | 1 row: the owner is the decider, dated 2001 |
| L5t | under the sibling, the approver flips its own decision to changes_requested, without touching the decision columns | 0 rows |
| L5t-a | L5t with the closure dropped | **1 row**, changes_requested, the original `decided_at`. The trigger does not guard `status`; the closure does |
| E1 | under the sibling with the closure dropped, the editor re-stamps the decision as itself | ERROR, the trigger |

**Runner mutations (measured).** Each round ran migrate-clean where marked, then `node --test
test-kits/db/foundation-contract.test.mjs`.

| # | Mutation | migrate-clean | static foundation-contract | Left on the database |
|---|---|---|---|---|
| J1 | the trigger probe's fourth drift, with `commit; begin;` appended (Q0's R1) | exit 2: "drift 4 contains transaction control", and "as built, after every drift: append-only table(s) …" | exit 1: "drift 4 holds no transaction control" | **`app.probe_child_of_security_events`, committed** (F4) |
| J2 | the same drift, escaping through `\connect` instead | exit 2, only the clean-again round | exit 1, **digest only** | the child table, committed (F4) |
| J3 | `decideCatalogProbes`: a drift that PASSES is not flagged when the label is the coverage probe | not run alone | **exit 0, 72 of 72**. Full `npm run verify`: **674 of 674** | – |
| J3 + J3s | J3, and the coverage rule silenced (`and false`) | **exit 0**, and it prints "closure coverage probe: … (self-test: refused its drift; clean again after every drift)" | exit 1, digest only | – |
| chain | J3 + J3s, the coverage probe's digest refreshed (`15309262269afd58` to `fb58a02d066773b7`), the integrity manifest regenerated | **exit 0**, the same claim; rls-smoke 990 of 990 | `npm run verify` **674 of 674** | – |
| J4 | `catalogProbeJobs` skips the coverage probe's drift (Q0's J2) | not run | exit 1: "every probe as built, after each of its drifts, and again at the end" | – |
| J5 | a rule written `assert …, '…'` in the pinned check probe | not run | exit 1, **digest only** (F5) | – |
| J6 | a rule written `raise '…'` (Q0's C2) | not run | exit 1: "every raise is `raise exception '<literal>...'`" | – |
| J7 | the pinned policy probe's prefix set to `''` (my J7 on 123) | not run | exit 1: "self-test 1's prefix says which rule it answers" | – |
| J8 + N10 | the FK-support probe's first rule silenced, over N10 (my J9 on 123) | exit 2: "fk support probe: its self-test after drift 1 passed" | exit 1, digest | – |
| V4 | `runOne` stops passing `violates` (Q0's V4) | – | `identity-isolation.test.mjs` exit 1: "refused with the right code by another constraint: fails" | – |

## §2 Answers to the brief's questions

### Q1. Does 125 match the Owner's disposition, and is the disposition an honest transcription?

**125 matches the disposition (measured, and read against the diff).**

| Disposition | What 125 does | Verdict |
|---|---|---|
| §3.1: 125 first, then 091, on `agent/claude/WP-0A-DB-00-batch-125` | this branch; no 091 content in the diff | TRUE |
| §3.2: the invoker trigger records the transaction's time when `decided_by` goes from NULL to a value, whatever the client sent | `125_…sql:50-76`; T1–T3 | TRUE |
| §3.2: a recorded decision's decider and time cannot change, for any writer | S1–S3, R3c-a, E1 | TRUE for every writer that fires triggers. A superuser with `session_replication_role = replica` skips it (S6), and the decision itself is not frozen (S5): F6 |
| §3.2 measured: 2001 and 2999 recorded as `now()`; a superuser's backdate or revert refused; a non-decision update of a settled row still works | T1, T2; S1, S2; S4 | TRUE, each reproduced |
| §3.2: `decided_at` stays in the client UPDATE grant, so no client statement changes shape | catalog; T3 | TRUE. One statement changes outcome: a decision sent without `decided_at` now lands (T3), where the pair refused it before |
| §3.3: RFC-2026-025's open points stay open, and the Owner presses every merge | the RFC-2026-025 blocker's append; the handoff's "FOR THE OWNER: press the merge" | TRUE |

**The disposition is an honest transcription as far as a record can be checked.** I cannot hear the
session. What I can check, I checked:

- **Every fact in §4 that GitHub holds matches** (measured): `7f6cefb`, 08:41:23Z, the account
  `workstationgroup`, head `e77f131`, `bootstrap` green on it, and the head containing `main`.
- **Read only.** The session messages, A0's two objections, the `--match-head-commit` flag, the
  merge state at the moment of merge, and that the Owner uses the same account.
- **§5 item 6 is quoted accurately.** RFC-2026-025 `:112-113` says a governance PR "is merged by the
  Owner personally, never by delegation". #162 carried a governance change:
  `architecture/decisions/RFC-2026-025-owner-delegated-merge.md` is in `git diff e276c9a e77f131`.
- **The caveat is stated plainly.** §4 says "A0 EXECUTED the Owner's decision; A0 did not make it"
  and "Its literal sentence was not satisfied". It says the RFC text is unchanged and that the
  author field is not the evidence of who decided. The RFC-2026-025 blocker carries the same caveat
  and adds "Whether an Owner's direct instruction may stand in for §5 item 6" as an open point.
- **One user request reached this run.** The harness relayed it to me as `merge #162 แล้ว
  ทำต่อได้เลย`, which is the wording §2 and §4 transcribe.
- **Wording.** §2 translates the identical words as a statement and §4 reads them as an
  instruction, and §4 is silent on RFC-2026-002 clauses 2 and 4. Each gap is recorded on its own
  blocker (F9).

### Q2. Does each row of A0's §2 table do what it says, and is every claim of fact true?

**The record's §2 table (`a0-batch-125-record-2026-09-28.md:22-32`):**

| Row | Claim | Verdict |
|---|---|---|
| A1 N1 / C0 F2 | the closure, pinned in a new probe, and an owner redecide case. R3c alone: all pass. R3c with the closure dropped: exactly the owner case fails. The closure dropped alone: the probe refuses it | TRUE (D1, D2, D3; R3c, R3c-a) |
| A1 F4 / Q0 F7 | the invoker trigger and its pins; two cases, 2001 and 2999. Trigger dropped or made a no-op: those two fail plus `…-naming-a-decider`. A superuser backdate or revert is refused, and a non-decision update lands | TRUE (D4, D5; T1, T2; S1, S2, S4). "For every writer": F6 |
| Q0 F1 | the job list derived independently; the verdict driven by outcomes built from the real probes; each drift answered by another rule's raise fails; claims count refused drifts | TRUE as written (J4). "Refused" counts every drift the verdict did not flag, and the real-probe test drives wrong-prefix answers only (J3, chain): F1 |
| Q0 F2 / C0 F5 | every raise that is not notice, warning, info, debug or log is counted and must be `raise exception '<literal>…'`; each prefix is at least 12 characters and matches only its own rule | TRUE (J6, J7). A rule written as `assert` is not a raise (J5): F5 |
| Q0 F3 / A1 N5 | `TRANSACTION_CONTROL` refused in any drift; every probe run again after all drifts; 11 probes, 38 jobs | TRUE (J1, round 0). The keyword check runs after the drifts, and a psql meta-command passes it (J2): F4 |
| Q0 F4 | the owner forging case on `content_items`; with E02c, exactly that case fails | TRUE (D6) |
| Q0 F5 | `violates` tested through `runCases` with a fake database | TRUE (V4) |
| C0 F6 | the FK-support probe first in the list with two drifts, its stale list ordered, its early run gone; both drifts refused by their own rules | TRUE (round 0, J8; read `run.mjs:108`, `:1768-1769`) |
| A1 N3 | the coverage probe reads every client-updatable `*_by` column; `decided_by` is the only one besides `updated_by` | TRUE (D7u; catalog). A1's remedy also named INSERT, and that half is open (D7): F2 |

**The record's other sections.** §2's closing list and the §3 counts are true (measured: 45/35/10,
eleven probes, 990 = 986 + 4, 72 and 303). §4 "Not done here" is true as far as it goes, but it
leaves out two things. A1 N5's optional backslash rule was not adopted (F4), and the INSERT half of
A1 N3 is still open (F2).

**The commit message.** Every claim of fact is true (measured above), with two exceptions.
- "each new refusal, removed, fails exactly its own case(s)" is looser than the record (F7).
- "the probe executor is pinned" is true for the planner, and it does not hold against J3 (F1).

**The README** (`db/foundation/README.md:320-397`) is true, with two exceptions.
- "A settled request cannot be touched" (`:355`) holds for `authenticated` only (F6).
- "five families of rules … in eleven probes" (`:322`) does not add up (F8).
- The rest is measured true. The FK-support description (four exemptions) and the closure text are
  exact. The coverage rule fails a new client-updatable attribution column by name (D7u). The
  clean-again round works (J1, J2), the keyword list is exact, and the static test does what the
  paragraph says (J4, J6, J7).

**The two blocker edits** (`work-packages/WP-0A-DB-00.json`, open blockers 186 and 190, each a pure
append to its base text, measured).
- **Blocker 186.** The eight items it says 125 closes are closed, except that item (8) reads
  "client-writable" and only its UPDATE half is closed (F2). Its STILL OWED list is accurate
  otherwise.
- **The RFC-2026-025 blocker.** The appended facts are true (measured on GitHub). Its unedited
  opening clause now contradicts them (F3).

### Q3. My F2, F5 and F6 on 123's corrections: answered as the record says?

| Mine | What I asked | What 125 did | Verdict |
|---|---|---|---|
| F2 LOW | a restrictive `using (status = 'pending') with check (true)` UPDATE closure on `approval_requests`, with 090's replacement and register (13) moving with it; or record the residual | exactly that closure, pinned by text in a probe and in 125's block, the register at 13, and an owner case beside my approver one | **CLOSED, measured.** My L5s shape, the decider re-deciding in its own name under a looser sibling, now affects 0 rows (L5t), and 1 row without the closure (L5t-a). The trigger adds a second layer for anyone else (E1, R3c-a) |
| F5 INFO | each prefix non-empty and beginning exactly one raise in its probe | length at least 12, `raises[i].startsWith(prefix)`, and no other raise of the probe starts with it (`foundation-contract.test.mjs:2353-2357`); across probes, the verdict loop refuses every other raise (`:2376-2382`) | **CLOSED, measured** (J7) |
| F6 INFO | the FK-support probe into `CATALOG_RULE_PROBES` with one drift per rule, and a digest pin | first in the list, two drifts, digest `c537f5e36d4aa7f4`, the early run removed and asserted gone (`:2332`) | **CLOSED, measured** (J8 + N10: the self-test now fails where the claim used to print) |

### Q4. The probe restructuring: at least as strict, and are the re-anchored tests still meaningful?

**At least as strict, piece by piece (measured unless marked).**
- **The FK-support probe inside the list.**
  - Before: one run as built, and a failure returned 1.
  - Now: as built, after each of two drifts, and again at the end, inside the executor that the
    static test pins by text. The verdict's `return 1` replaces the early run's.
  - It now runs inside `begin; … rollback;`, which changes nothing for a read-only block.
  - J8 is the case that used to print its claim over a live unindexed key. It now fails.
- **The clean-again round.** Strictly stronger. It is what catches J2, which the keyword rule misses.
- **`TRANSACTION_CONTROL`.** New, and a net gain. It is enforced statically before a database
  exists, and live only in the verdict, after the drifts have run (J1 leaves its child table
  committed): F4.
- **Claims counted from refused drifts.** This changes only the printed text, never the verdict.
  Under J3 a drift that passed is counted as refused, and the claim says so: F1.
- **The independently derived job list.** Q0's J2 is closed (J4).
- **The verdict driven by the real probes.** A wrong prefix on any real drift now fails, which
  closes Q0's J3. A drift that passes, or fails with another SQLSTATE, is still driven only on the
  synthetic probe `p`. So a label-scoped leniency survives the whole suite (J3 674/674), and with a
  refreshed digest it survives every layer (chain): F1. That is Q0 F1's class, narrowed and not
  closed. Before 125 the same chain also passed, so nothing got weaker.

**The re-anchored tests (read, and measured through J8).**
- **`every foreign key has a supporting index …` (`foundation-contract.test.mjs:2298-2305`).** Its
  old anchors, `const fkProbe = await script(FK_SUPPORT_PROBE_SQL)` and `return 1`, would now be
  false. The new ones are that the first probe's label is the FK-support probe and that its two
  raises are the two drifts' prefixes. The label assertion is weak alone, and it is not alone:
  - the catalog-rule test pins the list's SQL in order, first `FK_SUPPORT_PROBE_SQL` (`:2338`);
  - it asserts no `await script(FK_SUPPORT_PROBE_SQL)` outside the list (`:2332`);
  - it pins the executor's text (`:2334-2336`).

  Moving the probe out of the list fails two of these, and silencing its rule fails live (J8).
  Still meaningful.
- **`migrate-clean re-runs every apply-time block after the FK probe …` (`:2534-2539`).** The anchor
  moved from the removed line to `const probeOutcomes = [];`. It still requires the post-migrate
  pass to come after the catalog-probe loop, where the FK-support probe now runs. Still meaningful.
  Its name still says "after the FK probe" (F8).
- **The catalog-rule test** (`:2324-2331`). It is anchored on the ceiling probe and still orders
  ceiling, then the loop, then the pass.

### Q5. The replacement edit in `090_approval.1.sql` and its register entry

- **Additive (measured).** The static additive-only rule passes. Every line of `090_approval.sql`'s
  first block is still in the replacement, in order (`foundation-contract.test.mjs:2630-2640`). The
  lines 125 edits are lines an earlier replacement had already added. 125 only adds a name, a
  number or a marker to each.
- **Marked (read).** The header (`090_approval.1.sql:15`), the exact-set check (`:33`) and both
  exclusion lists (`:329`, `:356`) each carry `SUPERSEDED BY … 125`. Its raise message (`:34`) now
  names 125. The marker test requires a `125` for the new `superseded_by` entry (`:2605`).
- **Strict (measured, and read).**
  - The exact-set check (`:31-35`) now names seven restrictive policies, so any eighth fails.
  - The count and narrowing loops exclude the new policy by `(table, name)` pair (`:329`, `:356`),
    never by a bare name.
  - The excluded policy is pinned by text twice, in the pinned policy probe and in 125's block.
  - So the exclusion relaxes nothing that a pin does not re-assert.
- **`fails_with` (measured).** "batch 090 wrote 13 restrictive policies and it creates three tables
  to narrow". The pass requires the original block to raise exactly this and marks a mismatch stale,
  so round 0's green pass measured it. 13 is 12 plus the new policy. The literal stops before the
  `%`, and it matches the block's own raise.

### Q6. Floors and ownership

- **Floors.** The guard's own counts equal the floors: 72 tests and 365 assertions for
  foundation-contract, 303 and 2144 for identity-isolation (measured).
- **Ownership and verify.** `node scripts/verify-branch-scope.mjs 7f6cefb WP-0A-DB-00` exits 0 (17
  paths). `npm run verify` is 674 of 674 on both the review branch and the branch name, and the
  handoff guard passes on the branch name.
- **The rationale.** The manifest's rationale names the four unowned files and why each changed. The
  two files 123 declared and 125 no longer touches were removed from its amendment list.

### Q7. Stop-the-line? None

See §4.

## §3 Findings

Grades are mine. The Owner may regrade any of them.

### F1: LOW (measured). The verdict is driven by the real probes for wrong prefixes only, and "refused" counts whatever the verdict did not flag

**Where.** `scripts/db/run.mjs:510-513` and `test-kits/db/foundation-contract.test.mjs:2372-2382`.

**What.**
- **The counter.** A drift job that the `else if` does not flag falls through to
  `refused.set(...)`. So the claim counts the drifts the verdict failed to flag, not the drifts the
  probe refused with its raise.
- **The test.** It substitutes another rule's raise into each real drift job. It never substitutes a
  pass (`{ rows: [] }`) or another SQLSTATE. Those two answers are exercised only on the synthetic
  probe `p`.

**Measured.**
- **J3.** One line in `decideCatalogProbes` lets a passing drift through when the label is the
  coverage probe, and full `npm run verify` stays green (674 of 674). `run.mjs` is in no digest and
  not in the integrity manifest.
- **J3 + J3s.** With the coverage rule also silenced, migrate-clean exits 0 and prints "closure
  coverage probe: … (self-test: refused its drift; clean again after every drift)".
- **The chain.** With the probe digest refreshed in the same diff and the manifest regenerated,
  `npm run verify` is 674 of 674, migrate-clean is green with that claim, and rls-smoke passes 990
  of 990.

This is Q0 F1's class, narrowed and not closed. Q0's J2c showed what a silenced coverage rule then
exposes. I did not re-measure an exposure.

**Why LOW.** It needs two edits, and one of them changes a digest a reviewer sees. Nothing is live
on the clean set.

**Remedy.**
- In the static test, also drive each real drift job with `{ rows: [] }` and with a non-P0001 error,
  and require the verdict to fail each time.
- In `decideCatalogProbes`, count a drift only inside an explicit match (`error?.code === 'P0001' &&
  message.startsWith(job.raises)`), and fail when a probe's refused count differs from its declared
  drifts.
- Optionally, digest the planner and verdict functions' source beside the probe digests.

### F2: LOW (measured). Blocker 186 item (8) is recorded as closed, and only its UPDATE half is

**Where.** `scripts/db/run.mjs:232` (UPDATE only); blocker 186 (`work-packages/WP-0A-DB-00.json:439`),
item (8) "No coverage rule for other client-**writable** `*_by` columns"; the record's A1 N3 row
(`a0-batch-125-record-2026-09-28.md:32`).

**What.** A1's N3 remedy named "INSERT or UPDATE". The coverage probe reads UPDATE grants only.

**Measured.**
- **D7.** A later table with a client-INSERTable `approved_by` and no closure passes every layer:
  migrate-clean exit 0, rls-smoke 990 of 990.
- **D7u.** The same column made UPDATE-able is refused by name.
- **Today.** `created_by` (17 tables), `requested_by` (2) and `updated_by` (14) are client-INSERTable.
  So a general INSERT rule could not be switched on until `created_by` at INSERT is closed.

**What the records say.** Blocker 186's STILL OWED and the record's §4 list `created_by` at INSERT
as a specific item. Neither says that the general coverage rule is UPDATE-only.

**Why LOW.** It is drift-only, and A1 graded N3 a NOTE. It is LOW because it is a security blocker
item recorded as closed.

**Remedy.** Either:
- say in blocker 186 that item (8) is closed for UPDATE and that the INSERT half is owed with
  `created_by`; or
- extend the coverage probe to INSERT grants, with a pinned closure list per column (`updated_by` to
  `UPDATED_BY_CLOSURES`, `requested_by` to `REQUESTER_CLOSURES`) and `created_by` exempted by name
  until its closures exist, and give it a drift.

### F3: LOW (read). The RFC-2026-025 blocker's first sentence still says the Owner merges #162 personally

**Where.** `work-packages/WP-0A-DB-00.json:443`.

**What.**
- **The opening.** The blocker opens: "none reaches #162, which the Owner merges personally under §5
  item 6". That was A0's sentence before the merge.
- **The append.** 125's append to the same entry says A0 merged #162 and that §5 item 6's literal
  sentence was not satisfied.
- **The effect.** A reader of the first line gets the opposite fact, in the governance record the
  Owner acts on.

**Remedy.** Amend the clause in place, for example "none reaches #162, which A0 merged on the Owner's
direct instruction (disposition of 2026-09-28 §4)". It is A0's sentence, not RFC text, so it needs
no Owner approval.

### F4: INFO (measured). Transaction control is refused after the drifts have run, and a psql meta-command escapes the keyword rule

**Where.** `scripts/db/run.mjs:481`, `:498` and `:1774`; the comment at
`foundation-contract.test.mjs:2475`, "refused before anything runs".

**Measured.**
- **J1.** Both defences fire, and migrate-clean exits 2. But the drift ran before the verdict read
  it, and `app.probe_child_of_security_events` was left committed on the database.
- **J2.** `feed` passes each job to psql on stdin, so `\connect` ends the transaction as `commit`
  would. The regex does not see it, statically or live. Only the clean-again round catches it live,
  and only the digest catches it statically.

A1 N5 named the backslash rule as optional. The record's §4 does not say it was not adopted.

**Remedy.**
- Check every drift before the executor feeds any job: the keyword rule and a line beginning with a
  backslash. For example, add a pure `unsafeDrifts(probes)` called before the loop. It would be
  pinned by the executor regex.
- Correct the comment.
- Add the backslash rule to the static test, or record it as not adopted.

### F5: INFO (measured). A rule written as `assert` is not counted as a rule

**Where.** `foundation-contract.test.mjs:2349`.

**What.**
- **J5.** A rule written as PL/pgSQL `assert …, '…'` needs no drift, and only the probe digest
  notices it.
- **Why it matters.** `assert` raises P0004, not P0001, and `plpgsql.check_asserts = off` disables it
  silently.
- **Scope of the README.** "Counts every spelling of `raise`" is true of `raise`. It is not true of
  every way to write a rule.

**Remedy.** Count `\bassert\b` in the "every rule" total, or refuse `assert` in probe SQL.

### F6: INFO (measured). The trigger freezes the decider and the time, not the decision, and binds only writers that fire triggers on UPDATE

**Where.** `125_approval_settled_is_immutable.sql:57-63` and `:75-76`; README `:355`.

**Measured.**
- **S5.** A superuser can flip a settled request's `status` without touching the decision columns.
  The approver then stays named as the decider of a status it never chose.
- **S6.** `session_replication_role = replica` skips the trigger.
- **I1.** The trigger is BEFORE UPDATE only, so a non-client INSERT of a decided row keeps the
  `decided_at` it sends.

**Why INFO.** None of this is reachable by a client:
- `status` on a settled row is held by the closure (L5t);
- there is no client INSERT grant on the decision columns;
- no service path reaches the table (`approval_requests_service_path_closed`).

It is A1 N2's `authenticated`-only class, which is RFC-2026-023's question. The README heading "A
settled request cannot be touched" is true for clients.

**Remedy.**
- Say "by a client" in the README.
- If the Owner wants the decision frozen for every writer, have the trigger also refuse a change of
  `status` once `decided_by` is set. It refuses no legitimate flow today, because both permissive
  USING halves require a pending row.
- Consider a BEFORE INSERT branch that sets `decided_at` when `decided_by` is set.

### F7: INFO (read). The commit message is looser than the record on two points

**Where.** The body of `43f4d96`.

- **"Each new refusal, removed, fails exactly its own case(s)."** The closure removed alone fails no
  case: D3 is 990 of 990, and the probe refuses it. Its case fails only beside R3c (D2). The trigger
  removed fails three cases, one of them the pre-existing `…-naming-a-decider` (D4, D5). The record's
  §2 and the handoff state this exactly.
- **The changed `violates` is not in the commit message.** `editor-a-cannot-cancel-an-approval-request-naming-a-decider`
  (`isolation-cases.mjs:13554`) moved from the pair to 090's equivalence. That is disclosed in its
  why and in the record's row 2, not in the commit message. It is the same pattern as my F8 on 123.
- **The consequence.** Since 125 the pair cannot fire on a decider without a time at UPDATE, because
  the trigger fills the time first. That cancellation now rests on 090's equivalence alone. The pair
  still refuses a time without a decider (`…-with-only-a-decided-at`, `:13586`, green in round 0),
  and both constraints are pinned by text.

**Remedy.** None needed for the code. A commit message is not amended.

### F8: INFO (read). Three wording points

- **README `:322`.** It says "five families of rules … in eleven probes. The first is the FK-support
  probe". The numbered list has five families, and the FK-support probe is outside it, so the eleven
  probes carry six.
- **`foundation-contract.test.mjs:2534`.** The test is still named "… after the FK probe …". Its
  anchor is now the catalog-probe loop.
- **`125_…sql:38`.** The comment says "Numbered 125 so it sorts … after 124, batch 091's". No record
  in the repository reserves 124 for batch 091. When 091 lands, a fresh build will apply 124 before
  an integrated 125. That is harmless before G0 and has a precedent (123 inserted before 130). 091's
  author should know that 125's block and 090's replacement run after it.

**Remedy.** "six families", or put the FK-support probe in the numbered list. Rename the test when
it is next touched. Record the 124 reservation where migration numbers are planned.

### F9: INFO (read). Three wording points in the disposition

- **§2** translates `merge #162 แล้ว ทำต่อได้เลย` as a statement: "#162 is merged; go ahead"
  (`product-owner-disposition-2026-09-28-after-162.md:29-30`). **§4** reads the identical words as an
  instruction (`:57-58`). §4 says the Thai allows both readings, but a reader who quotes §2 alone gets
  only the first. One sentence in §2 pointing to §4 would close it.
- §4's "wrote `merge #162 แล้ว ทำต่อได้เลย` a third time" describes the third message. That exact
  phrase was written twice.
- **§4** addresses §5 item 6's governance bullet and "RFC-2026-002's literal sentence". It does not
  point to RFC-2026-002 clause 2's Integration Owner verdict or clause 4's "unresolved security
  finding". Both are already on their blockers: the missing r0 evidence, and "unresolved" undefined
  in the RFC-2026-025 blocker's (d). A1's re-verification said nothing blocked the Owner's merge.
  Nothing is hidden, but §4 could cite them.

## §4 Stop-the-line verdict

**None.** I measured no secret exposure, no tenant leakage, no live attribution forgery on the clean
set, no lost job, no migration divergence and no irreversible deletion. 125 is not on `main`, so
editing it rewrites no integrated migration.

- **Nothing here blocks the Owner's merge, in my reading.**
  - F1–F3 are LOW. F1 and F2 are drift-only. F2 and F3 can be closed by a record edit.
  - F4–F9 are INFO.
- **Two findings touch security: F2 and F6.** Whether either counts as an "unresolved security
  finding" under RFC-2026-002 clause 4 turns on a term the RFC-2026-025 blocker already records as
  undefined. That is the Owner's call, not mine.
- **The pressing of #163's merge is the Owner's** under the disposition's §3.3.

## §5 Limits

- **Brief and independence.** I worked from A0's brief, in A0's worktree, as the same vendor and
  model family (§0).
- **What I did not see.** I did not hear the session. The Owner's words, A0's objections and the
  moment of #162's merge are read from A0's transcription. Only what GitHub records was measured.
- **CI.** I did not read CI run `36399350920`'s steps. I saw only that it succeeded on `d85a643`.
- **What my rounds prove.** Each drift and mutation was one edit, or a stated chain. They show what
  each layer does with that edit, not that no other edit passes. A1 N4 still holds: one drift per
  raise proves the raise can fire, not every predicate inside it.
- **The superuser.** I measured S5, S6 and I1 as a superuser only. I did not measure a
  non-superuser table owner, or a role with BYPASSRLS other than `postgres`.
- **Exposure.** I did not re-measure an exposure through the F1 chain. Q0's J2c on 123's
  corrections is the measured exposure of a silenced coverage rule.
- **PostgreSQL version.** Everything ran on PostgreSQL 17.11. The pins compare deparsed text and a
  body digest, which a major-version change could move. The README says so.
- **Scratch files.** They stay in my private directory, `scratchpad/c0-125/`: the round, drift and
  mutation scripts and their logs, and the clone. None is committed.
