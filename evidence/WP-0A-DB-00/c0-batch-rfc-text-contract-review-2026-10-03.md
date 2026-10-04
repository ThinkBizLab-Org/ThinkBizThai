# C0 contract review: batch rfc-text (RFC-2026-026/027 brought in line with the Owner's answers, still Proposed)

| Field | Value |
|---|---|
| Package | `WP-0A-DB-00` |
| Role | Independent Reviewer run `/claude/c0_contract_reviewer` |
| Subject | branch `agent/claude/WP-0A-DB-00-batch-rfc-text`, head `54f5dd0` (handoff), evidence `6489596`, code `cdf6774`, base `88a6670` (main); PR [#179](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/179), Draft |
| Author | `/claude/a0_atlas` |
| Reviewed in | local branch `review/c0-batch-rfc-text`, created at `54f5dd0` in my own worktree (`wf_bb3eb819-b4c-2`). For the branch-NAME guards I checked `agent/claude/WP-0A-DB-00-batch-rfc-text` out by name in this worktree (`git checkout --ignore-other-worktrees`; the name is checked out in A0's worktree `wf_bb3eb819-b4c-1`; the ref already pointed at `54f5dd0`, equal to `origin`), committed nothing on it, restored every drift, and switched back. Nothing was pushed. |
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

**Both RFCs are still Proposed** (Status lines read: RFC-026 line 3, RFC-027 line 3, each "NOT approved" and each
saying the answers are not an approval). The revisions close every finding the re-checks left in the text — C0-9,
C0-10, A1 F4-a (option (i)), A1 C2, Q0R-F1..F4 — and the citations I checked are true (§2.2). §8.2/16 is now
executable as written; §8.1/1 is now decidable, with two gaps in how widely it reads (C0-RT-2, C0-RT-3).

**One inconsistency with the Owner's recorded answers (C0-RT-1, MEDIUM):** the recommendation the Owner accepted
for Q-026-1 (disposition rfc-026-027 §7) says a refusal about a workspace the user cannot reach **goes to
`app.security_events` once Q-026-9 gives it a producer**. Q-026-9 now gives it one, but RFC-026 §3.3/4 and §3.7
say that refusal is **not recorded** in either table, and §10.1 records "not recorded" as the Owner's answer.
That is a change A0 made, recorded as an answer. It blocks **approval** of RFC-026, not this merge.

All measured guards exit 0 on the branch NAME; `npm run verify` is 685/685. The commit messages, the plan, the
disposition, the `[195]` append and the handoff are true, with two INFO inaccuracies (C0-RT-5). **No stop-the-line.
Nothing I found blocks the merge of this Draft**, provided the required check on `54f5dd0` is green — it was still
`in_progress` when I read it (C0-RT-7).

## 2. Measured vs read

### 2.1 Measured (Node `v24.20.0`, `node -v` before every run; logs in my private dir `c0-rfc-text/`)

| # | Command | Where | Result |
|---|---|---|---|
| M1 | `node scripts/verify-branch-scope.mjs 88a6670 WP-0A-DB-00` | branch NAME at `54f5dd0` | exit 0: "all 9 changed path(s) are declared, and every amendment explains one" |
| M2 | `npm run check:handoff` | branch NAME | exit 0: "describes the branch: nothing substantive after its cited head" |
| M3 | `npm run verify` | branch NAME | exit 0: "clean: exit 0 — tests 685, pass 685, fail 0, skipped 0, todo 0" |
| M4 | Drift D1 re-run: every `line` in `audit-coverage-map.json` +1; `node --test test-kits/db/foundation-contract.test.mjs` | working tree, restored by copy | exit 1: tests 81, pass 80, fail 1 — "batch 141 prep: the audit coverage map names real tables, real §8 rows, live blockers, and no producer". Matches plan §2 D1 |
| M5 | Drift D4 re-run: one byte appended to RFC-027; `node scripts/verify-test-coverage-floor.mjs` | working tree, restored by copy | exit 86: "RFC-2026-027-lifecycle-visibility.md — content does not match its recorded digest". Matches D4 |
| M6 | `git status --short` after M4 and M5 | | empty |
| M7 | Script: `open_blockers` at `88a6670` vs head | | 197 and 197 entries; only index 195 differs; the old text is a strict prefix of the new; top-level keys changed: `ownership`, `open_blockers` only; in `ownership`: `branch`, `amends_without_owning` only |
| M8 | `audit-coverage-map.json` `line` fields | | 33 in the file, 33 changed in the diff, each −1; line 275 of the manifest holds "nothing can write an audit row today" (blocker 21) |
| M9 | `test-kits/integrity-manifest.json` | | `files` holds 90 digests; three changed (RFC-026, RFC-027, `branch-identity.test.mjs`) |
| M10 | `gh pr view 178`, `gh run view 37217282992` | | #178 merged 2026-10-04T16:48:40Z, head `a0965f7`, merge commit `88a6670`; run success on `a0965f7` — the disposition §3 row is true |
| M11 | `gh pr view 179`, `gh run view 37220551684` | | Draft, head `54f5dd0`; the `bootstrap` run on `54f5dd0` was `in_progress` (started 2026-10-04T17:27:05Z) when read |

D2 and D3 (committed drifts) were not re-run: they need a commit on the subject branch, and the scope guard they
exercise is the same one M1 passes. I took them as read from the plan.

No live database round: no migration, invariant, fixture, isolation case, `scripts/db/**` or CI file changed, and
the one lint file changed only in line pins the static suite alone reads (M4 is the drift that reads them). No
cluster was created and port 5505 was not bound.

### 2.2 Read (citations checked against the tree at `54f5dd0`)

- `140_audit.sql:583-606` (security_events columns, nullable actor pair, actor CHECKs), `:740-741` (app_worker
  SELECT/INSERT), `:895` (the probe's `begin` in a `DO` block; the insert is `:896`), `:362` (one function,
  `private.refuse_mutation`, names no audit table), `:685-697` (four triggers) — true.
- `011_authorization_helpers.sql:306-317` (jwt_subject granted to nobody), `:320` (`is_active_member` to
  `authenticated`), `:282-290` — true. No other migration grants `is_active_member`.
- No migration function names `app.audit_logs`/`app.security_events` outside `140`; every `execute` hit in
  `db/foundation/migrations/*.sql` (041, 091, 125, 126, 130, 131, 140) is inside a `DO` block, not `pg_proc` — so
  "exemption list empty today" holds as a reading of migration text, as the RFC says.
- `RFC-2026-023` §3.2: `acting_user_admits_page(workspace uuid, business uuid, page_context uuid)`, owned by
  `app_authz`, membership AND scope — matches §3.3's call. Batch `021`'s `covers_business` counts a page row on
  its business (`021_member_scope.sql:409-426`), so §8.2/20's admitted half (B and the in-scope page) is
  reachable.
- `service-policy-map.json:138` holds the quoted denial wording — true.
- `tests/db/identity/isolation-cases.mjs:17674` is a `returning 1` case — true.
- RFC-027 §6/6's 89/8 and the three-name exemption list: consistent with Q0's recheck §3.3 (10 minus the two
  `user_profiles` policies = 8; minus §3.3's five `010` rewrites = 3). Cited, not re-measured by me.
- §10.1 rows of both RFCs against disposition rfc-026-027 §5/§7/§8: Q-026-2..9 and Q-027-1..6 match the
  recommendation current at that merge (Q-026-5/Q-027-5 take §7's "whichever lands first"). Q-026-1 does not
  (C0-RT-1).
- RFC-027 Status line now names RFC-020's Status line, §5/3, §6.1/5, §6.1/6, §6.3/14 = the Amends line (C0-10
  closed). RFC-020 §6.3/13 requires EXECUTE "granted explicitly", not to `authenticated` alone, so granting
  `is_active_member` to `app_command` does not amend RFC-020.
- The Owner's words: the four standing quotes are each present in the cited dispositions. The new words
  `แล้วลุยต่อยาวได้เลยคืนนี้` exist only in A0's own record; I cannot check chat. They authorize nothing beyond the
  standing goal, and this batch decides nothing.

## 3. Findings

| id | grade | where | finding | remedy | owner |
|---|---|---|---|---|---|
| C0-RT-1 | **MEDIUM** (contract vs the Owner's recorded answer; blocks RFC-026's approval, not this merge) | `architecture/decisions/RFC-2026-026-audit-row-producer.md:188-191` (§3.3/4), `:302-304` (§3.7), `:638` (§10.1 Q-026-1 row); `evidence/WP-0A-DB-00/product-owner-disposition-2026-10-03-batch-rfc-026-027.md:129` | The recommendation the Owner accepted for Q-026-1 (§7, as §8 reads it) is: membership for every command row, **and** "a refusal about a workspace the user cannot reach goes to `app.security_events` once Q-026-9 gives it a producer, and is held with Q-026-4 until then". This batch gives Q-026-9 its producer, yet §3.3/4 and §3.7 say such a refusal "has no producer in either table", and §10.1 records the answer as "not recorded, beside Q-026-4". The route is expressible under §3.7's own command predicate: an event attributed to the acting user, in a workspace the actor IS an active member of (the question's own wording, RFC-026 `:618`: "a `security_events` row in a scope the actor can reach"). So the RFC replaces an accepted answer with the other branch of option (a) and records the replacement as the Owner's answer. | Either (i) write the route: §3.7 states that a refusal about an unreachable workspace is a `security_events` row in a workspace the actor can reach (and what happens when the actor has none: held with Q-026-4), with a §8.2/21 case; or (ii) keep "not recorded", but record it in §10.1 as A0's departure from the accepted recommendation, with the reason, and put that half back to the Owner and A1 as an open question on `[195]`. Before RFC-026 is approved. | A0 writes; A1 (Q-026-1, Q-026-9 owner) and the Owner decide |
| C0-RT-2 | LOW (decidability gap, read) | `RFC-2026-026…md:465-474` (§8.1/1 (a), (b)) | (a) and (b) read functions "in schemas `app` and `private`" whose code "names `app.audit_logs` or `app.security_events`". Two spellings pass all of (a)-(d): a function in `public` or a new schema; and a `SECURITY INVOKER` function whose `proconfig` sets `search_path=app` (or sets none) and names `audit_logs` unqualified. `scripts/db/run.mjs` probe 3 already learned this lesson for SECURITY DEFINER (A1 F2: "in EVERY schema but the system ones"), and only definer, trigger and policy-helper functions are pinned to an empty `search_path`. Today it is mitigated: probe 5 pins every trigger on a table in `app`/`private` and the functions they run, and probe 3 pins every definer function, so the residual is an invoker function called some other way. | State (a)/(b) over every non-system schema, and match the relation by name whether or not it is qualified (or refuse any function naming an audit relation without `search_path=""`). Add both spellings to the named drifts. | A0 |
| C0-RT-3 | LOW (decidability, read) | `RFC-2026-026…md:475-480` (§8.1/1 (c)) | "contains a PL/pgSQL `EXECUTE` statement" does not say what the lexer looks for. `walkLevels` lexes every string literal's value as SQL (`sql-lexer.mjs:447-469`), so a `raise exception '… execute …'` inside a function surfaces an `execute` token, while `RETURN QUERY EXECUTE` and `OPEN … FOR EXECUTE` do not start a statement. Two implementors can read (c) differently, one of them leaky. | Define (c) as: any unquoted identifier token `execute` at any level of a function's `prosrc`, with false positives going to the pinned exemption list (fail closed). Name `return query execute` in the drifts. | A0 |
| C0-RT-4 | INFO (design interaction, read) | `RFC-2026-026…md:166-176` (§3.3/2) with `RFC-2026-027…md` §3.2 | Once RFC-027 lands, `is_active_member` refuses a workspace in a blocked state. A command that moves its own workspace into `access_blocked` (or any blocked state) and then writes its `succeeded` row in the same transaction is refused by §3.3's literal — the `INSERT` statement sees the `UPDATE` — so the action can never commit. Fail-closed, and §11.4 assigns `Closing → AccessBlocked` to no command today, but neither RFC says so. | One sentence in §3.3/2: transitions into a blocked state are the worker's (or the command writes its row before the transition), with an §8.2 case when that command lands. | A0 |
| C0-RT-5 | INFO (truth of records) | `evidence/WP-0A-DB-00/a0-batch-rfc-text-plan-2026-10-03.md:76-77`; A0's done report | (a) The plan says `check:handoff`, `verify-branch-scope` at the head and `npm run verify` "are recorded in the handoff and the PR body". The PR body has them; the handoff's `tests` (11 rows) has none — its last row is "make db-migrate-clean … NOT RUN". (b) A0's report says the handoff's old `head_revision` `b7dc53f` "was already on the path, so no repoint was needed". The handoff at `54f5dd0` cites `88a6670..6489596`, i.e. refresh **did** repoint it, as commit `54f5dd0`'s own message says. The repository files are right; the two sentences are not. | Correct the plan's sentence (or add the three rows to the handoff); do not repeat (b) in the merge record. | A0 |
| C0-RT-6 | INFO (citation) | `RFC-2026-026…md:298` | "§9.1's 'replay anomaly'" is the ERD's §9.1 (`sprint-0a-core-erd-rls-retention-th.md:455`, SECURITY-4); RFC-026 has no §9.1, and its §9 is "Migrations". | Name the document. | A0 |
| C0-RT-7 | INFO (merge bar) | PR #179 | The required `bootstrap` run on `54f5dd0` (37220551684) was `in_progress` when read. | Merge only on a green run on the reviewed head (batch 127 §6). | A0 / Integration Owner |

Prior findings, now closed in the text (read): C0-9 (§3.3's literal calls the page form; no helper is called with
a null id; §8.2/20), C0-10 (Status line), A1 F4-a option (i) (refusal rows name no scope; §8.2/18 rewritten with
the caller's own workspace), A1 C2 and Q0R-F3 (Q-026-5, Q-027-5 wording), Q0R-F1 (§8.2/16: injection A,
assertions, control, self-test, the two refused injections — executable as written; the case's "after the raise"
assertions need the harness's per-case savepoint, which the §8.6 shape provides), Q0R-F2 (§8.1/1 now a catalog
rule; residuals C0-RT-2/3), Q0R-F4 (§6/6 scope and 89/8).

## 4. Questions asked of me

- **Consistent with the Owner's recorded answers, RFC-020/021/022/023 and the ERD, every citation true, Status
  still Proposed?** Yes, except C0-RT-1 (Q-026-1's `security_events` half). Status lines: Proposed, both.
  Citations: true as checked (§2.2), one ambiguous (C0-RT-6).
- **Are §8.1/1 and §8.2/16 decidable and executable as written?** §8.2/16: yes. §8.1/1: decidable over the catalog
  with the repository lexer, but it reads too narrowly (C0-RT-2) and leaves (c)'s token rule to the implementor
  (C0-RT-3). Neither is executed yet — both are owed to the command half, as the RFC says.
- **Commit messages, plan, disposition, blocker edits, handoff true?** Yes, except C0-RT-5's two sentences.
- **Guards on the branch NAME?** `verify-branch-scope` 0, `check:handoff` 0, `npm run verify` 0 (685/685).

## 5. Stop-the-line verdict

**No stop-the-line.** No secret, tenant data path, migration, grant, policy or external side effect changed; the
batch is the text of two Proposed records plus packaging. **Nothing I found blocks the merge of this Draft** once
the required check on the reviewed head is green (C0-RT-7). **C0-RT-1 blocks the approval of RFC-2026-026**, and
C0-RT-2/3 should be fixed before that approval; none of them is a defect in anything in effect.

## 6. Limits

- Same vendor and model family as the Author (§0).
- I re-ran D1 and D4 only; D2/D3 are taken from the plan. I executed none of the RFC's SQL: the §3.3 literal, §3.7's
  policies, §8.1/1 and §8.2/16-21 are text, and my reading of them (including C0-RT-2/3/4) is reasoning, not a
  measurement.
- The 89/8 census is Q0's, cited.
- I cannot see chat, so the Owner's new words are as A0 recorded them.
- Private artefacts (not in the repository): `c0-rfc-text/` under the session scratchpad — `scope.log`,
  `handoff.log`, `verify.log` (via the task output), `d1.log`, `d4.log`, `wp-main.json`, the two backups.
