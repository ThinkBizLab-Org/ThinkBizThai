# C0 contract review re-check: batch rfc-text's review round (RFC-2026-026/027, still Proposed)

| Field | Value |
|---|---|
| Package | `WP-0A-DB-00` |
| Role | Independent Reviewer run `/claude/c0_contract_reviewer` (narrow re-check) |
| Subject | branch `agent/claude/WP-0A-DB-00-batch-rfc-text`, head `eaf92dd` (handoff), evidence `6613697`, code `a35a619`, base `88a6670` (main); previous reviewed head `54f5dd0`; PR [#179](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/179), Draft, OPEN |
| Author | `/claude/a0_atlas` |
| My earlier review | `evidence/WP-0A-DB-00/c0-batch-rfc-text-contract-review-2026-10-03.md` (C0-RT-1..7), cherry-picked here as `98cc81c` |
| Reviewed in | local branch `recheck/c0-batch-rfc-text`, created at `eaf92dd` in my own worktree (`wf_bb3eb819-b4c-6`). For the branch-NAME guards I checked `agent/claude/WP-0A-DB-00-batch-rfc-text` out by name in this worktree (`git checkout --ignore-other-worktrees`; the ref and `origin` both point at `eaf92dd`), ran the three guards, committed nothing on it, and switched back. Nothing was pushed. |
| Status | Records findings. **Advances no status, approves nothing.** |

## 0. What I am

- I am a subagent **spawned by the Author run `/claude/a0_atlas`**, in a worktree and under a brief its workflow
  computed. I am the same vendor and model family as the Author and as every other reviewer of this package.
  `RFC-2026-024` withdrew the cross-vendor condition; it did not remove the correlated-blind-spot risk, and a reader
  should discount my agreement with the Author accordingly.
- This file is evidence. **Accepting it as the C0 role's signature is the Integration Owner's and the Product
  Owner's act**, not mine and not the Author's.
- I do not fix. I approve no RFC, no batch and no merge.

## 1. Answer

**Both RFCs are still Proposed** (Status lines, line 3 of each: "NOT approved"; each new `Revised:` line says the
revision "approves nothing and answers no question"). My seven findings are closed or correctly carried:
C0-RT-1 by its remedy (ii) — "not recorded" is now A0's reconciliation, re-opened as **Q-026-10, unanswered**, in
§3.3/4, §3.4, §3.7, §10, §10.1 and `open_blockers[195]`, consistently; C0-RT-2/3 in §8.1/1, and **measured** here with
the repository's lexer, not a regex (§2.1 M8); C0-RT-4 and C0-RT-6 in the text; C0-RT-5 not repeated in any
repository record; C0-RT-7 still open (the required run on `eaf92dd` was `in_progress` when read).

The citations I checked are true (§2.2). §8.2/16 is unchanged and stays executable as written. **§8.1/1 is now
decidable over the catalog, with one internal contradiction the widening introduced (C0-RR-1, LOW):** reading the
full definition means every function names itself, so (b) as written selects every producer. Q-026-10's option (i)
assumes a column `app.security_events` does not have (C0-RR-2, LOW). Three INFO items on records (C0-RR-3..5).

All measured guards exit 0 on the branch NAME; `npm run verify` is 685/685. **No stop-the-line.** Nothing I found
blocks the merge of this Draft once the required check on `eaf92dd` is green. Q-026-10 (and C0-RR-1/2) block the
**approval** of RFC-2026-026, not this merge.

## 2. Measured vs read

### 2.1 Measured (Node `v24.20.0`, `node -v` before every run; PostgreSQL 17.11 from `/opt/homebrew/bin`; logs in my private dir `c0-rfc-textr2/`)

| # | Command | Where | Result |
|---|---|---|---|
| M1 | `node scripts/verify-branch-scope.mjs 88a6670 WP-0A-DB-00` | branch NAME at `eaf92dd` | exit 0: "all 12 changed path(s) are declared, and every amendment explains one" |
| M2 | `npm run check:handoff` | branch NAME | exit 0: "describes the branch: nothing substantive after its cited head" |
| M3 | `npm run verify` | branch NAME | exit 0: "clean: exit 0 — tests 685, pass 685, fail 0, skipped 0, todo 0" |
| M4 | Script over `work-packages/WP-0A-DB-00.json` at `88a6670`, `54f5dd0`, `eaf92dd` | | top-level key changed `54f5dd0`→`eaf92dd`: `open_blockers` only; 197/197/197 entries; only index 195 differs from either; the `54f5dd0` text (and main's) is a strict prefix of the new one; file 459 lines at both branch heads, so the coverage map's line pins need no move |
| M5 | `shasum -a 256` of both RFCs vs `test-kits/integrity-manifest.json` | | match (`769e6c52…`, `c431cf0b…`); `files` holds 90 digests |
| M6 | `git diff --name-only 88a6670..a35a619` | | 12 paths, as the handoff's scope row says |
| M7 | Round r1 on 127.0.0.1:5505, fresh `initdb --locale=C -A trust -U postgres`, TCP only, `LC_ALL=C`, shim first: `make db-migrate-clean`, `make db-rls-smoke` | | exit 0 ("51 apply-time blocks, 39 re-run as written, 12 superseded"); exit 0 ("1087 isolation case(s) passed", "6 claim(s) discharged by execution") |
| M8 | §8.1/1 (a)-(c), (e) approximated with **the repository's lexer** (`walkLevels` over `pg_get_functiondef`, scope = `userObject` minus `pg_depend.deptype = 'e'`, prokind `f`/`p`; script `rule.mjs`), on r1 after `migrate-clean` | | **14** functions in scope (`app` 9, `private` 4, `auth` 1), 36 extension members excluded; (a), (b), (c), (e) select nothing; 0 lexer refusals; nothing past `NESTED_DEPTH`. After `rls-smoke` the count is **18** (`private` 8: the smoke's four `as_*` helpers). **Every one of the 14 definitions contains its own name as an identifier token** (C0-RR-1) |
| M9 | Round r2 (fresh initdb each attempt), six drifts appended to `140_audit.sql`, none with a trigger: X1 invoker in `public` inserting into `app.audit_logs`; X3 `set search_path = app`, bare `audit_logs`; X2 `BEGIN ATOMIC` made through `EXECUTE` in a `do $$` block; `return query execute`; `raise exception 'refusing to execute this'`; `raise exception 'the caller can''t do this'`. Then `make db-migrate-clean` and M8's script | | migrate-clean exit 0 ("52 apply-time blocks, 40 re-run"); (a) selects X1, X2, X3; `prosqlbody` set on X2 only; (c) selects `return query execute` (depth 1) and the message (depth 2); the apostrophe message gives **1 lexer refusal** at an inner level (C0-RR-3); all six definitions name themselves |
| M10 | `140_audit.sql` restored from a copy after r2 | | sha256 `2ac596bb950e8dfb…` before and after; `git status --short` empty. Two earlier r2 attempts failed in the post-migrate pass on my own drift's shape (a `do $d$` tag; then a non-idempotent `create function` re-run); each was restored and re-initdb'd |
| M11 | `gh pr view 179`; `gh run list --branch …` | | OPEN, Draft, head `eaf92dd`; run 37223567906 (`Bootstrap validation`) on `eaf92dd` **`in_progress`** when read; 37220551684 on `54f5dd0` success |
| M12 | PR #179 body | | carries `check:handoff` 0, `verify-branch-scope` 0 (12 paths), `npm run verify` 0 (685/685) for the review round |

Cluster stopped and its data directory removed; port 5505 free afterwards. No other port was touched.

### 2.2 Read (against the tree at `eaf92dd`)

- **C0-RT-1 closure.** RFC-026 Status line, `Revised:` line 12, §3.3/4 (`:199-215`), §3.4, §3.7 (`:328-337`), §10's
  lead, Q-026-10 (`:715`), §10.1 Q-026-1 and Q-026-4 rows (`:727`, `:730`): each now says "not recorded" is A0's
  reconciliation and that Q-026-10 is unanswered; none chooses an option. Disposition rfc-026-027 `:129` (Q-026-1's
  superseded recommendation) and `:130` (Q-026-9's) do conflict as the text says. `:95` (Q-026-4) names refusals
  that never reach a producer; the §10.1 Q-026-4 row no longer adds the unreachable-workspace class.
- **C0-RT-2/3 closure.** §8.1/1 (`:492-570`) states the scope by `userObject` (`scripts/db/run.mjs:485-487`, true),
  bare-name matching, `pg_get_functiondef`, (c)'s token definition, the reader list, (d) via the pinned trigger probe
  (`run.mjs:1194`, `:1206-1220`, `n.nspname in ('app', 'private')` — true; the constants date from batch 126,
  `f421764`, and read every table in `app`/`private` since the owed-tooling batch), (e), and eight drifts.
  The "bypassed three times" history is `run.mjs:439-443` (A1 V11, C0 G1, Q0 F1-sf) — true.
- `psql-driver.mjs:557-564`: `BEGIN ATOMIC` refused only when `depth === 0` — true as cited.
- `021_member_scope.sql:448-450`: the `business` arm admits a page by its business id alone — true (A1 F3).
- `011_authorization_helpers.sql:339-341`: the roster policy admits owner and admin only — true (RFC-027 §5/6).
- ERD `sprint-0a-core-erd-rls-retention-th.md:455` is `SECURITY-4` under "### 9.1 Classification levels" — true
  (C0-RT-6).
- `open_blockers[191]` (7) is the platform-scope security-event gap — true as cited by Q-026-10 (ii).
- A1's prototype rows (P1-P5, G7, N1) cited in §3.3/2-3 exist in `a1-batch-rfc-text-security-review-2026-10-03.md:65-87`.
- RFC-020/021/022/023: no change in this round touches what they fix; my earlier reading (§2.2 of the earlier
  file) stands. RFC-027's only change is §5/6's assertion role.
- Commit messages `a35a619`, `6613697`, `eaf92dd`: true against the diff (12 paths; `[195]` prefix kept; 90
  digests; repointed `head_revision` `6489596` → `6613697`).

## 3. Findings

### 3.1 My earlier findings

| id | was | now |
|---|---|---|
| C0-RT-1 | MEDIUM | **Closed in the text** by remedy (ii); Q-026-10 is open and owed to A1 and the Owner before RFC-026's approval. See C0-RR-2 on its option (i). |
| C0-RT-2 | LOW | **Closed**; measured (M9: X1 in `public`, X3 bare, X2 atomic each selected by (a)). |
| C0-RT-3 | LOW | **Closed**; measured (M9: `return query execute` and a message `execute` selected by (c)). |
| C0-RT-4 | INFO | Closed (§3.3/2 `:177-182`). |
| C0-RT-5 | INFO | Closed in the repository records: plan §6.2 corrects (a); no repository record repeats (b). See C0-RR-5. |
| C0-RT-6 | INFO | Closed (§3.7 table, worker row). |
| C0-RT-7 | INFO | **Open**: run 37223567906 on `eaf92dd` was `in_progress` (M11). |

### 3.2 New

| id | grade | where | finding | remedy | owner |
|---|---|---|---|---|---|
| C0-RR-1 | **LOW** (decidability; measured, M8/M9) | `architecture/decisions/RFC-2026-026-audit-row-producer.md:503-509` with `:525` (§8.1/1 (b)) | Moving the rule from `prosrc` to `pg_get_functiondef(oid)` puts each function's own `CREATE OR REPLACE FUNCTION schema.name(` header into the text it tokenises. Measured: 14 of 14 in-scope definitions on a clean set, and 6 of 6 drift functions, contain their own name as an identifier token. So (b) — "No function read names a producer function" — selects **every producer by its own header**, which (a) requires to exist: the rule as written refuses its first producer. Fail-closed, so nothing leaks, but two implementors will resolve it differently (exclude the self-name, or read the body only) and the self-test list has no case that a lone producer passes. | Say in (b) "names a producer function other than itself" (or tokenise the body only for (b): `prosrc` plus `pg_get_function_sqlbody`), and add to the drifts a control: a pinned producer alone passes (a)-(e). Before the command half lands. | A0 |
| C0-RR-2 | **LOW** (the question put to the decider; read) | `RFC-2026-026…md:333-335` (§3.7), `:715` (Q-026-10 option (i)); `db/foundation/migrations/140_audit.sql:583-592` | Option (i) is "a command event in a workspace the actor *can* reach **naming the attempted id**", said to be "expressible under the command policy above as written". The predicate admits such a row, but `app.security_events` has no column that can hold an id: `workspace_id` (would be the reachable one), `occurred_at`, `event_type` (a dotted grammar, ≤ 96), the actor pair and two 32-byte hashes. So (i) as worded needs a forward migration adding a column — the kind Q-026-9's accepted recommendation (disposition `:130`) did not recommend before G1 — or the id spelled into `event_type`, a misuse of its grammar. My own C0-RT-1 remedy (i) said "a `security_events` row in a scope the actor can reach" and did not raise this either. | Before Q-026-10 is put: state in option (i) what it costs (a column on `security_events`, with its classification under ERD §9.1 `SECURITY-4`, or recording the attempt without the id), so the decider is not choosing an option the table cannot hold. | A0 writes; A1 and the Owner decide |
| C0-RR-3 | INFO (decidability; measured, M9) | `RFC-2026-026…md:507-509` | `walkLevels` lexes every literal's value as SQL, so ordinary prose in a message yields lexer refusals at inner levels: `raise exception 'the caller can''t do this'` gave 1 (an unterminated quote in the decoded text). §8.1/1 does not say whether a refusal, or a level past `NESTED_DEPTH` (reported through `beyond`), fails the function, is ignored, or goes to the exemption list. Today the clean set has 0 of each (M8), so nothing is decided by it yet. | Say it: tokens are collected at every level whatever the refusals; a refusal at level 0 or a `beyond` fails closed (exemption list); inner refusals do not. | A0 |
| C0-RR-4 | INFO (truth of a measured claim) | `RFC-2026-026…md:568-569`; plan §6.3 r1 row | "on a clean `migrate-clean` it selected nothing, out of 18 functions in scope (`app`, `private`, `auth` …)": after `migrate-clean` the scope holds **14** (app 9, private 4, auth 1); 18 is the count after `rls-smoke` adds its four `private.as_*` helpers (M8). Plan §6.3's r4 note half-says this. The conclusion (nothing selected) stands. | Say 14 at the rule's read point, at the next edit. | A0 |
| C0-RR-5 | INFO (records) | `handoffs/WP-0A-DB-00-author-handoff.json:187`, `:210`; A0's run report | (a) The last `tests` row records exit 0 for `check:handoff`, `verify` and the scope guard "in the PR body and plan §6.4"; plan §6.4 lists the commands and says "exit codes in the handoff" — neither holds the results; the PR body does (M12), so the claim is true only of the PR body. (b) `reviewer_instructions` still says "the diff 88a6670..cdf6774" and "(a)-(d)". (c) A0's run report again says `head_revision` 6613697 "needed no repoint"; `eaf92dd`'s own message, rightly, says refresh repointed it from `6489596`. Repository state is correct. | At the next refresh: point the row at the PR body only, update the instructions; do not repeat (c) in the merge record. | A0 |

## 4. Questions asked of me

- **Consistent with the Owner's recorded answers (disposition §5/§7/§8), RFC-020/021/022/023 and the ERD; every
  citation true; Status still Proposed?** Yes. Q-026-1's second half is no longer recorded as an answer; it is
  Q-026-10, unanswered. Citations checked are true (§2.2), with one count wrong (C0-RR-4). Both Status lines:
  Proposed.
- **Are §8.1/1 and §8.2/16 decidable and executable as written?** §8.2/16: yes (unchanged). §8.1/1: decidable over
  the catalog with the repository's lexer — measured on a clean set and six drifts — except that (b) contradicts
  (a) once the full definition is read (C0-RR-1), and refusal handling is unstated (C0-RR-3). Neither is a gap a
  defective function could pass through; both are fail-closed.
- **Commit messages, plan, disposition, blocker edits, handoff true?** Yes, except C0-RR-4's count and C0-RR-5's
  pointers. The disposition was not changed in this round.
- **Guards on the branch NAME?** `verify-branch-scope` 0 (12 paths), `check:handoff` 0, `npm run verify` 0
  (685/685).

## 5. Stop-the-line verdict

**No stop-the-line.** No migration, grant, policy, tenant data path, secret or external side effect changed; the
round is text of two Proposed records, a blocker append, a regenerated manifest and evidence. **Nothing I found
blocks the merge of this Draft**, provided the required check on `eaf92dd` (run 37223567906) is green — it was not
yet when I read it (C0-RT-7). **Q-026-10 blocks the approval of RFC-2026-026**, and C0-RR-1 and C0-RR-2 should be
fixed before that approval; none is a defect in anything in effect.

## 6. Limits

- Same vendor and model family as the Author (§0).
- My §8.1/1 run is an approximation with the real lexer (`rule.mjs`, private), not the rule, and no producer exists
  yet, so (b) and (e) were exercised only by the self-name observation and by having no selected trigger function.
  I did not re-run D2/D3 or A0's r3/r4; I re-ran a clean round and one drift round.
- I executed none of §3.3's or §3.7's SQL; A1's prototype is cited, not repeated.
- I cannot see chat; the Owner's words are as the dispositions record them.
- Private artefacts (not in the repository), under the session scratchpad `c0-rfc-textr2/`: `scope.log`,
  `handoff.log`, `verify.log`, `pr-body.md`, `wp-*.json`, `initdb-*.log`, `pg-*.log`, `r1-migrate.log`,
  `r1-smoke.log`, `r1-rule.json`, `r1-rule-after-smoke.json`, `r2*-migrate.log`, `r2c-rule.json`, `drifts.sql`,
  `rule.mjs`, `140_audit.sql.bak`.
