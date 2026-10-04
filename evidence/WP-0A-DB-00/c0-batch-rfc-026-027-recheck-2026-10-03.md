# C0 contract review re-check: batch rfc-026-027's review round

| Field | Value |
|---|---|
| Run | `/claude/c0_contract_reviewer` |
| Role | Independent Reviewer (contract), work package `WP-0A-DB-00`, narrow re-check |
| Subject branch | `agent/claude/WP-0A-DB-00-batch-rfc-026-027` (PR #174, Draft) |
| Subject head | `80c171fc9bbd6051fb1e8b37c0b708dd3f4da50f` (handoff refresh, alone), over code `b6d65e1592cd88757668f734ac53376dd7730f44` |
| Previous reviewed head | `e64e1f5` (`c0-batch-rfc-026-027-contract-review-2026-10-03.md`, cherry-picked as `b55f0e1`) |
| Base | `f3e6fbc` (`main`) |
| Author | `/claude/a0_atlas` |
| Date | 2026-10-04 (file name carries the phase date, 2026-10-03) |
| Reviewed in | local branch `recheck/c0-batch-rfc-026-027`, created at `80c171f` in my own worktree. The guards that read the branch name were run with the subject branch NAME checked out (`git checkout --ignore-other-worktrees`, read-only, nothing committed there), then I switched back. |
| Scope | `git diff e64e1f5..80c171f` whole (the round), against my eight findings first; then A1's and Q0's findings only where the round's text answers them; RFC-2026-020 (the amended sentences), RFC-2026-023 §3, `140_audit.sql`, `pinned-grants.json`, the two contracts, ERD §11.4. |

This document records review findings. It advances no status, approves nothing, and signs nothing on
anyone's behalf.

## §0 What I am, before anything else

- I am a subagent **spawned by the Author run `/claude/a0_atlas`**, in a git worktree A0's workflow
  created, under a brief A0's workflow wrote. A0 chose the questions I answer and asked for this re-check.
- I am the **same vendor and model family** as the Author (Claude). RFC-2026-024 withdrew the
  cross-vendor condition, so that is not by itself a bar; it is still a real limit on independence.
- Whether this file counts as the Reviewer signature RFC-2026-002 requires is for the **Integration
  Owner and the Product Owner** to decide. I approve neither RFC: approval is the Owner's and A1's act.

## §1 Verdict in one paragraph

All eight of my findings are answered, and each answer is true. The C0-2 test is now the one I said I needed: every "now" text in
RFC-2026-027 §3.4 is **byte-identical (whitespace-normalised) to RFC-2026-020**, the line numbers are
right, and the sentences kept are quoted correctly. C0-1 is fixed by scoping, not by inventing
`security_events` predicates (Q-026-9). C0-3's eleven ids are exactly the coverage-map rows whose tables
`authenticated` can write in `pinned-grants.json`. That is all of them and none extra. The cherry-picks are patch-identical. `[195]` is a
pure append with no pin move, and the three guards and `verify` are green on the branch NAME. One new
**LOW** defect came in with the review round. The revised §3.3 policy literal checks only the
**business** helper, but the text now says a refusal row "cannot name another tenant's business **or page**". As written, the literal
admits any `page_context_profile_id` (C0-9). There is also one INFO: RFC-027's Status line understates the RFC-020 places it now amends
(C0-10). **No stop-the-line.** **Nothing here blocks the merge of this Draft.** C0-9 should be fixed
before RFC-026 is approved, alongside Q-026-1 and Q-026-9, which already block approval.

## §2 Measured (re-run by me; Node `v24.20.0`, `/Users/bank/.local/node-v24.20.0/bin` first on the PATH, `node -v` printed before each run)

| What | Command | Exit | Result |
|---|---|---|---|
| re-check branch | `git checkout -b recheck/c0-batch-rfc-026-027 80c171f…` | 0 | created, clean; `80c171f` = local and `origin` ref of the subject branch |
| round range | `git log --oneline e64e1f5..80c171f` | 0 | `b55f0e1`, `b66a868`, `54ad956` (role runs), `b6d65e1` (round), `80c171f` (handoff) |
| cherry-picks | `git range-diff e64e1f5..369c495 e64e1f5..b55f0e1` (and `c276e01`/`b66a868`, `f91294e`/`54ad956`) | 0 | each pair differs **only** by the `(cherry picked from commit …)` line; patches identical |
| RFC-020 quotes | node (`quotecheck.mjs`, private): every `>` block under "Now:" in RFC-027 §3.4, whitespace-normalised, searched in RFC-2026-020 | 0 | **5 of 5 "now" quotes FOUND** verbatim; the kept remainder of §5/3's last paragraph and of §6.3/14 FOUND; RFC-020 itself unchanged in the range |
| RFC-020 line numbers | `grep -n` | 0 | `:3` Status, `:393` §5/3 p1, `:404` second code block (ends `:405`), `:407-411` last paragraph, `:444` §6.1/5, `:448` §6.1/6, `:476` §6.3/14: as RFC-027 §3.4 cites |
| ERD diagram | node: slice of `sprint-0a-core-erd-rls-retention-th.md` §11.4 | 0 | RFC-027 §2's block equals the ERD's 12 lines (`[*] --> Active` … `Deleted --> [*]`, `Verify --> PurgeQueued` included) |
| C0-3 list | node (`c03check.mjs`, private) over `pinned-grants.json` and `audit-coverage-map.json` | 0 | 20 rows; exactly the **11** listed ids have a table on which `authenticated` holds INSERT or UPDATE; the other 9 have none; all 11 ids exist |
| C0-3 policies | `grep` of `create policy … for insert|update … to authenticated` per table | 0 | each listed table has at least one; `user_profiles_update_own` read at `010:466-469` |
| C0-4 contracts | node: `ctr-job-001/schema.json` `required`; `ctr-ten-001/schema.json` `required` | 0 | JOB requires `job_id` (13 fields); TEN requires `workspace_id, actor, request_id, correlation_id, locale, timezone`; `causation_id` is a property, not required |
| C0-1 columns | `sed -n 583,606p 140_audit.sql`; `pinned-grants.json` | 0 | `security_events`: `workspace_id, occurred_at, event_type, actor_kind, actor_id, source_ip_hash, user_agent_hash, created_at`, nullable actor pair; `app_worker` `SELECT, INSERT` (`:186-187`) |
| blockers | node (`blockers.mjs`, private): `open_blockers` at `e64e1f5`, `80c171f`, `f3e6fbc` | 0 | 196 → 196; only `[195]` changes; its old text is a strict prefix (+3876 chars, items (3)-(7)); vs `main` only `[21]`, `[95]` (appends) and new `[195]`; **0** line-pin mismatches (`open_blockers[k]` on line 256+k); no other manifest field changed |
| pin `:221` | `sed -n 221p pinned-grants.json` | 0 | `authenticated` `UPDATE ["name", "lifecycle_state", "updated_by"]` on `app.workspaces`: `[195]` (4) and RFC-027 §4 cite the right line |
| run.mjs names | `sed`/`grep` | 0 | `PERMISSIVE_POLICIES` at `:305`; `POLICY_SET`/`PINNED_POLICY_KEYS` at `:1672-1676`; messages "unlisted or changed: app." (`:407`) and "policy(ies) no pinned list names" (`:1688`); `010`'s nine workspace policies are keys there |
| question count | `grep -c '^| Q-02[67]-'` | 0 | 9 + 6 = **15** |
| scope on the NAME | `node scripts/verify-branch-scope.mjs f3e6fbc WP-0A-DB-00` | **0** | "all 16 changed path(s) are declared, and every amendment explains one" |
| `check:handoff` on the NAME | `npm run check:handoff` | **0** | "describes the branch: nothing substantive after its cited head" (handoff head `b6d65e1`, base `f3e6fbc`) |
| verify on the NAME | `npm run verify` | **0** | "clean: exit 0 — tests 684, pass 684, fail 0, skipped 0, todo 0"; tree clean afterwards |
| DB readers | `grep -rn 'work-packages/\|architecture/decisions\|evidence/' scripts/db db/foundation/ci Makefile` | 0 | one comment (`rls-smoke.mjs:28`); no reader: A0's §7.4 claim is true |
| PR #174 | `gh pr view 174` | 0 | OPEN, **Draft**, base `main`, head `80c171f`, not merged, body ends with the Generated-with line |
| CI on `80c171f` | `gh run list --branch …` | 0 | run `37176358037` "Bootstrap validation": in progress, then `gh run view` → **success**, headSha `80c171f`; `e64e1f5`'s run `37174834595` success |

**No live database round.** The round changes two decision records, four evidence files, the handoff,
the integrity manifest and one appended blocker sentence; nothing the DB layer reads (measured above),
and no line pin moved. No drift was owed, and C0-9 is a reading of a proposed literal against
RFC-2026-023's helper, which does not exist to execute. Port 5505 was not used; no cluster was started.

## §3 Read, not measured

- RFC-026 §3.1 new paragraph, §3.2, §3.3 (policy and /1-/3), §3.4 (the exception-block paragraph and the
  rollback sentence), §3.5 heading sentence, §3.6, new §3.7, §4, §5.1 parenthesis, §5.5, §8.1/1-3 and /6,
  §8.2 heading line, /7, /10, /16-/18, §9/1-2, §10 Q-026-1, -4, -5, -9, §11 two bullets.
- RFC-027 Revised and Amends lines, §2 (the diagram), §3.1 closing paragraph, §3.4 (seven changes), §4's
  two new bullets, §5 cases 1, 7, 10, 11, §6/6, Q-027-5, §11 bullet.
- RFC-2026-023 §3.2-§3.3: `acting_user_admits_business(workspace, business)` and a **separate**
  `acting_user_admits_page(workspace, business, page_context)`; "with the page form where the table
  carries `page_context_profile_id`".
- A1's evidence: round r4 (`:48`, `:116`), case 9 (`:132`), F2-b's remedy (`:195`, "`<acting-user helper
  admits the scope>`"), the 91/10 census (`:171-173`), the PostgREST-shaped CTE (`:77`). Q0's evidence:
  M1, M3, M4 (`:156-159`), `CASE` in `SET` (`:87`), F6. All cited claims match.
- Plan §7 (every row of §7.2), disposition §7, the handoff's `tests`, `known_limitations` and
  `recommended_next_work_packages`, and both round commit messages.

## §4 My findings, re-checked

| ID | Was | Change in the round | Re-check |
|---|---|---|---|
| C0-1 | MEDIUM | RFC-026 scoped to `app.audit_logs` (§3.1, §3.2, §3.3, §3.5, §4, §8.1/2-3, §8.2, §9); new §3.7; new Q-026-9 | **Resolved.** No sentence left proposes a policy or grant on `security_events` (grep: every mention defers to §3.7/Q-026-9 or is §8.1/1's negative, which rightly covers both tables). §3.7's column list matches `140:583-606`; "`app_worker`'s grants, no policy, no writer" matches `pinned-grants.json:186-187`. Holding the predicates as a question, not inventing them, is the right call. |
| C0-2 | MEDIUM | §3.4 rewritten as seven quoted changes | **Resolved.** Measured, §2: all five "now" texts verbatim, line numbers right; (a) paragraph 1 vs the last paragraph is now correct; (b) the kept sentences are named; (c) Status line (appended, not rewritten) and §6.3/14 are amended; (d) §6.1/5 has text; (e) the `token_hash` sentence is restated. The replacements are internally consistent with §3.1 (`app.jwt_subject()` is already in `app_authz`'s own policy, `011:267`). See C0-10 for one leftover in RFC-027's own Status line. |
| C0-3 | LOW | §5.5 lists 11 ids | **Resolved, and exact** (§2): exactly the rows with an `authenticated` INSERT/UPDATE grant on a row's table. The text correctly says "read, not measured on a catalog" and that touching a table is not necessarily the row's act. |
| C0-4 | LOW | §3.2 grounded on `job_id` | **Resolved**; both contract statements measured true. |
| C0-5 | INFO | Q-026-5/Q-027-5 qualified; "irreversibly by any client"; `[195]` (3) appended | **Resolved.** The qualification matches my P1-P8, A1's table and Q0's P5. |
| C0-6 | INFO | diagram quoted whole | **Resolved** (equal to the ERD's 12 lines). |
| C0-7 | INFO | appended to `[195]` (6) with Q0-F9 | **Resolved as recorded** (not fixed; tooling, owed). |
| C0-8 | INFO | `[195]` (4), Q-027-5, disposition §7: the revoke lands in the first of batch 170's migrations, any lifecycle-selecting job, or RFC-027's, whichever first | **Resolved.** |

## §5 Answers to the brief's questions

**Consistent with RFC-020/021/022/023/025, ERD §8.4/§11.4 and the Owner's answers?** Yes, except C0-9. RFC-026 still
implements Q141-a = B (command or worker only, no trigger). The round narrows it to `audit_logs` and leaves no writer on
`security_events` until Q-026-9, which keeps §8.4's `S` cell a service cell with no client grant. It still
records Q141-c as a constraint. RFC-027 still implements Q170-a. Its §3.4 now amends RFC-020 by exact text, and the
approval words on RFC-020's Status line stay as they are. RFC-021 and RFC-025 are untouched. The disposition's §7 changes A0's
*recommendations* only and answers nothing, which matches "the Owner has said nothing new". One
inconsistency with RFC-023 is new (C0-9). RFC-023 has a separate page helper, and RFC-026 §3.3/2 says the page form
applies, but the literal it proposes to pin (§8.1/2) does not contain it.

**Is every citation true?** Every one I checked is true (§2, §3), including all RFC-020 line numbers, `140:583-606`,
`pinned-grants.json:221`, `run.mjs:305`/`:1671-1677`, and the A1/Q0 cases and mutants cited.

**Is the RFC-020 amendment text in RFC-027 exact?** **Yes**, measured (§2). The one leftover is RFC-027's own Status line (C0-10).

**Is the writable-path amendment justified?** The round does not touch it (`writable_paths` is unchanged
`e64e1f5..80c171f`). My earlier answer stands, and scope is 0 with 16 paths.

**Is the `lifecycle_state` finding correctly graded and owed?** Yes. It is MEDIUM and not stop-the-line today, and all
three role runs agree. `[195]` (4) now records A1's two conditions under which it **would** become stop-the-line:
RFC-027's gate landing without the revoke, and any purge job selecting by `lifecycle_state`. It also makes the revoke a precondition of
each, with an isolation case that must use the no-column-read form. That is the right way to own it. It is
still owed: a migration plus Q-026-5/Q-027-5. It is pre-existing on `main`, and this batch does not widen it.

**Claims in commit messages, plan, disposition, blocker edits and handoff: true?** Yes, for every claim I
re-measured or re-read. This covers the cherry-pick map and that the picks are clean, the "seven places" in §3.4, the 11 ids, 90 digests with only the
two RFCs changing, 684 tests, `[195]`-only append with no pin move, fifteen questions, "nothing a DB layer
reads changes", 16 paths in scope, handoff head `b6d65e1` and base `f3e6fbc`, and the PR being Draft and unmerged. One wording
caveat: plan §7.2 says F2-b is fixed "in shape" by A1's remedy. That is true for the business id, but the
remedy's `<acting-user helper admits the scope>` became the business helper only (C0-9).

## §6 New findings

| ID | Grade | Where | Finding | Remedy | Owner |
|---|---|---|---|---|---|
| C0-9 | LOW | `architecture/decisions/RFC-2026-026-audit-row-producer.md:125-133` (policy), `:146-148` (§3.3/2), `:159` (§3.3/3), `:236-240` (§3.6), `:412-414` (§8.1/2), `:463-466` (§8.2/18); `RFC-2026-023…` §3.2-§3.3 | The revised `WITH CHECK` admits a row when `app.acting_user_admits_business(workspace_id, business_profile_id)` is true, **whatever `page_context_profile_id` holds**. `audit_logs` has no foreign key on either scope column (`140:661`, `open_blockers[32]`). So, under the literal §8.1/2 would pin, a `denied` row with an admitted (or null, for an unscoped member) business and **another tenant's page id** is admitted. The same holds for a `succeeded` row. This contradicts §3.3/3 ("cannot name another tenant's business or page") and §3.3/2 ("Its page form applies where `page_context_profile_id` is not null"). RFC-023 §3.2 defines the page form as a separate function, `acting_user_admits_page`, which the literal never calls. §8.2/18 tests the business id only, so it would pass with this gap open. Not live: no producer, grant or policy exists. | Before RFC-026 is approved: write the page form into the literal, e.g. `case when page_context_profile_id is null then admits_business(…) else admits_page(workspace_id, business_profile_id, page_context_profile_id) end` in the admitting disjunct, and state what `admits_business(ws, null)` answers. Add a §8.2/18 twin with another tenant's page id. Or narrow §3.3/3's sentence to "business". | A0 (author), A1 (F2-b's owner) |
| C0-10 | INFO | `architecture/decisions/RFC-2026-027-lifecycle-visibility.md:3` vs `:8` and §3.4 | RFC-027's Status line still says "`RFC-2026-020`'s §5/3 and §6.1/5-6 read as they do today until this file carries an approval". The Amends line and §3.4 now also amend RFC-020's Status line and §6.3/14. This is harmless, because nothing changes before approval anyway, but the Status line no longer lists what it holds back. | When next edited: "`RFC-2026-020`'s Status line, §5/3, §6.1/5-6 and §6.3/14 read as they do today …". | A0 |

No other new defect. A1's and Q0's findings are not mine to close. I note only that the round's text
answers each as plan §7.2 says, and that the new cases (RFC-026 §8.2/16-18, RFC-027 §5/10-11, §6/6) are
text and have not been executed, which the RFCs' §11 and the handoff state.

## §7 Stop-the-line verdict

**No stop-the-line.** The round changes no migration, policy, grant, pin, lint rule or anything the DB
layer reads. It introduces no secret exposure, tenant leakage, duplicate side effect, lost job,
migration divergence, irreversible deletion or contract mismatch. C0-9 is a defect in a Proposed
literal that nothing executes. The pre-existing `[195]` hole stays MEDIUM, and is now bounded by two recorded
stop-the-line preconditions.

**Does anything block the merge?** Nothing from this re-check. C0-9 belongs with Q-026-1 and Q-026-9 as things to settle
before **approval** of RFC-026, not before the merge of Proposed records. Before a merge, the head's
CI run must be green. It is: run `37176358037` on `80c171f` was in progress at my first read and then
completed with **success** (`gh run view`, headSha `80c171f`). Integration Owner evidence
remains owed (`[188]`). Whether A0 may press the merge under the standing delegation is not mine to decide.

## §8 Limits

- Narrow by brief: the round's diff and my own findings. I did not re-read the unchanged parts of either
  RFC, did not re-run the first review's drifts (D1, D3, D7) or probes, and did not re-measure A1's or
  Q0's prototypes.
- No live database round (justified in §2). C0-9 is read, not executed. RFC-2026-023's helpers do not
  exist, and a stand-in would test my stand-in.
- C0-3's policy side is a `grep` of policy headers plus one policy read in full, not a catalog read.
- CI is read from GitHub, not re-run. This file's own commit is on my local re-check branch, is not
  pushed, and has no CI run.
- Private artefacts (not in the repository), under the scratchpad's `c0-rfc-026-027r2/`:
  `quotecheck.mjs`, `c03check.mjs`, `blockers.mjs`, `scope.log`, `handoff.log`, `verify.log`.
