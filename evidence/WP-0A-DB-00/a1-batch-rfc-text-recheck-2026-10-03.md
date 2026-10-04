# A1 security re-check: batch rfc-text's review round (RFC-2026-026/027 corrections)

- **Package:** `WP-0A-DB-00`. **Role:** independent Security/Privacy reviewer, run `/claude/a1_bastion`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-rfc-text` (PR #179, Draft, open, not merged), head
  `eaf92dd` (`eaf92dd5766a595f9a07e5180f4f285bcbbe7561`) over code `a35a619` and evidence `6613697`, base
  `88a6670` (main). Author `/claude/a0_atlas`. Previous reviewed head `54f5dd0` (my review:
  `a1-batch-rfc-text-security-review-2026-10-03.md`, cherry-picked here as `3720c85`). NARROW re-check of
  the review-round corrections.
- **Checked out as:** local branch `recheck/a1-batch-rfc-text` at `eaf92dd`, in this run's own worktree
  (`wf_bb3eb819-b4c-7`). For `verify-branch-scope`, `check:handoff` and `verify` I checked out the branch
  NAME `agent/claude/WP-0A-DB-00-batch-rfc-text` in the same worktree (`--ignore-other-worktrees`; `git
  branch --show-current` printed that name, `HEAD` = `eaf92dd`), committed nothing there, and switched
  back to `recheck/a1-batch-rfc-text` before any cluster round and before this file.
- **Status:** this file records findings. It advances no status, approves nothing (neither RFC, no
  answer, not Q-026-10, not anything as the owner of batch `140`), and fixes nothing.

## 0. What I am

I am a subagent started by a workflow of `/claude/a0_atlas`, the Author of this batch, and the same vendor
and model family as the Author and as the drafter of both RFCs. Under RFC-2026-024 that is the stated
independence limit of this role run. Accepting this re-check as the A1 role's signature is the Integration
Owner's and the Product Owner's act, not mine. Most corrections re-checked here adopt remedies this role
wrote (F1-F4); on those I am reviewing this role's own advice. A1 is also a named decider of Q-026-10 and
the owner of batch `140`; nothing here answers Q-026-10.

## 1. Read and measured

**Read:** `CONTRIBUTING_AGENTS.md`; my earlier review (above); the plan's new §6
(`a0-batch-rfc-text-plan-2026-10-03.md:92-155`); the disposition (unchanged since `54f5dd0`); the three
commit messages `a35a619`, `6613697`, `eaf92dd`; `git diff 54f5dd0..eaf92dd` in full for both RFCs, the
manifest and the handoff, and `git diff 88a6670..eaf92dd --stat`; `140_audit.sql:417-507`, `:583-617`,
`:711-714`; `021_member_scope.sql:440-452`; `011_authorization_helpers.sql:336-341`; `scripts/db/run.mjs:485-487`
(`userObject`), `:488-525` (client privilege probe), `:955-1015` (SECURITY DEFINER probe and its
extension-member history), `:1928-1945` (rewrite-rule probe), `:1194-1220` (pinned trigger probe);
`docs/sprint-0a/sprint-0a-core-erd-rls-retention-th.md:455`; PR #179's body and checks (`gh`).

**Measured.** Node `v24.20.0` from `/Users/bank/.local/node-v24.20.0/bin` (`node -v` printed before every
measured run; the PATH Node 26 was not used). PostgreSQL from `/opt/homebrew/bin`, port **5501** only,
`127.0.0.1`, TCP only (`unix_socket_directories=''`), `initdb --locale=C -A trust -U postgres` every round,
`LC_ALL=C`, the shim first, then `DB_TEST_URL=postgresql://postgres@127.0.0.1:5501/postgres make
db-migrate-clean`. Private directory `scratchpad/a1-rfc-textr2/`. The drift of r2 was APPENDED to
`140_audit.sql` and restored from a copy: sha256 prefix `2ac596bb950e8dfb` before and after every round,
and `git status` clean after. The cluster was stopped and its data directory removed; port 5501 has no
listener after.

| command | where | exit | result |
|---|---|---|---|
| `node scripts/verify-branch-scope.mjs 88a6670 WP-0A-DB-00` | branch name | **0** | "all 12 changed path(s) are declared, and every amendment explains one" |
| `npm run check:handoff` | branch name | **0** | "describes the branch: nothing substantive after its cited head" |
| `npm run verify` | branch name | **0** | "clean: exit 0 — tests 685, pass 685, fail 0, skipped 0, todo 0" |
| r1: `make db-migrate-clean`; `make db-rls-smoke` | 5501, clean tree | **0**; **0** | "51 apply-time blocks, 39 re-run as written, 12 superseded"; "db-authz-proofs: ok — 6 claim(s)", "db-rls-smoke: ok" |
| r2: `make db-migrate-clean` with drifts R1 + R2 appended (§3) | 5501 | **0** | as r1: every layer of `migrate-clean` green with both drifts in |
| r3: `make db-migrate-clean`; `make db-rls-smoke` | 5501, clean tree | **0**; **0** | as r1; plus a function count (§4, N4) |
| manifest comparison script (`cmp.cjs`), `54f5dd0` vs `eaf92dd` | worktree | 0 | §5 |

## 2. My earlier findings, re-checked

| id | was | now | verdict |
|---|---|---|---|
| F1 (MEDIUM) | §10.1 recorded "not recorded" as the Owner's answer; the conflict between the accepted Q-026-1 route and Q-026-9's predicate unstated | Status line, §3.3/4 (`:206-215`), §3.4 (`:252-256`), §3.7 (`:329-335`), §10's Q-026-10 row (`:715`), §10.1 Q-026-1 (`:727`) and Q-026-4 (`:730`) now say it is A0's reconciliation, name the conflict, drop the class from Q-026-4's answer and re-open it as **Q-026-10** for A1 and the Owner with the three options I listed; `[195]` says so | **closed** as a recording fault. One new inaccuracy in how option (i) is put — N3 |
| F2 (MEDIUM) | §8.1/1 read `app`/`private` by name, `prosrc`, qualified names only; no rule for triggers elsewhere | §8.1/1 (`:494-548`) reads every `userObject` function's `pg_get_functiondef`, matches bare names, adds (e) over the whole of `pg_trigger`, and lists the drifts incl. mine (2, 7) | **closed for what it names**, but the new text exempts extension members (N1, newly opened) and still reads only functions and triggers (N2) |
| F3 (LOW) | the page gap for `business`/`all_businesses` members unstated; §8.2/17 did not cover it | §3.3/3 (`:186-198`) states it with the `021:448-450` reading and G7; §8.2/17 (`:640-643`) adds the case and asserts the recorded page is the changed row's | **closed** (re-read `021:440-452`: `all_businesses` admits every page id, `business` every page id under it — the text is right) |
| F4 (INFO) | §3.3/2 and the handoff stated the membership term unconditionally | §3.3/2 (`:171-174`) and the handoff's `security_privacy_cost_impact` carry §3.3/1's claims assumption | **closed** |
| F5 (INFO) | `system_actor` id has no form | held on `[195]` as A1's, with the worker half | correctly recorded as owed; mine |
| F6 (INFO) | none | none | — |

The policy literals did not change: `git diff 54f5dd0..eaf92dd` of RFC-026 has no `+`/`-` line containing a
`WITH CHECK`, and §3.3's literal (`:137`) and §3.7's command row (`:325`) are as I prototyped them at
`54f5dd0`. So my P1-P7, R1-R3, G1-G8 and E1-E5 results stand for this text; I did not re-execute them.

## 3. Drifts measured on 5501 (r2)

Appended for one round to `140_audit.sql`, restored byte for byte. Neither drift has a trigger on a table
in `app` or `private`, as the revised §8.1/1 requires of its own drifts.

- **R1 — an extension member.** `public.a1r_ext_member()`, `SECURITY INVOKER`, `search_path=''`, inserting
  into `app.audit_logs`, then `alter extension pgcrypto add function public.a1r_ext_member()`.
- **R2 — a rewrite rule outside `app`/`private`.** `public.a1r_rule_target(id)`, `INSERT` granted to
  `app_command` only (no client role, so the client-privilege probe does not see it), and
  `create rule … as on insert to public.a1r_rule_target do also insert into app.audit_logs (…)` with a
  forged `actor_id`.

Results (r2, after `migrate-clean` exit 0):

| question | result |
|---|---|
| does `migrate-clean` (every probe in it, the SECURITY DEFINER probe's extension-member rule included) refuse either drift? | **no**, exit 0 |
| revised §8.1/1 (a)'s scope (`userObject`, extension members excepted, `pg_get_functiondef` matched for `audit_logs`/`security_events`, a regex standing in for the lexer) | selects **nothing** |
| the same reading without the extension-member exception | selects `public.a1r_ext_member` (`ext_member = t`, `prosecdef = f`) |
| pgcrypto members | 36 on the clean tree, **37** with R1 |
| rewrite rules anywhere whose definition names an audit table | `public.a1r_rule_target.a1r_rule_audit` — no part of §8.1/1 reads `pg_rewrite` |
| R2 executed: `set local role app_command; insert into public.a1r_rule_target values (1)` (rolled back) | `INSERT 0 1`, and `app.audit_logs` then holds one `succeeded` row, `actor_id = 'forged-by-rule'` — written by the rule's action as the table owner, past the forced RLS on `app.audit_logs` |
| negative control: the same row inserted by `app_command` directly | refused, "permission denied for schema app" (`app_command` has no path of its own today) |

## 4. Answers to the questions put to this run

**Does requiring membership for every command audit row close the cross-tenant denied-row write (Q-026-1)?**
Yes. The literal is unchanged since my prototype (§2), which refused another tenant's and a non-existent
`workspace_id` for every outcome (P1-P4) and admitted the own-workspace control (P5), with the negative
control N1. The text now carries the qualifier my F4 asked for: it holds while the request tier alone sets
`request.jwt.claims`.

**Is the `security_events` producer rule sound?** For isolation, yes and unchanged (E1-E5). The worker arm
is still containment, not isolation, and its `system_actor` id form is still owed (F5, A1's). What changed
is the framing of the lost record: it is now an open question (Q-026-10) and not an accepted gap. One
statement in that question is not true of the table as it stands (N3): option (i) cannot "name the
attempted id" on `140`'s columns.

**Does §3.3 now refuse another tenant's page?** The text now says exactly what the policy does: it refuses
another tenant's page **only** for a member narrowed by a `page` scope (§8.2/20, G3); for an unnarrowed,
`all_businesses` or `business`-scoped member the policy admits it (G5-G7) and only §3.6's copy-from-the-row
holds the relation, which §8.2/17 now tests for the `business`-scoped case. The row stays in the caller's
own workspace under the caller's own actor. That is a correct statement of a residual, not a refusal; the
policy-side check stays owed with `open_blockers[32]`'s foreign key (Q-026-2).

**Is anything newly opened by the text?** One thing: §8.1/1's new **extension-member exception** (N1). The
earlier text read `app` and `private` by name and would have read an extension member placed there; the
revised text reads more schemas but skips every extension member everywhere, and one `ALTER EXTENSION …
ADD` moves any function into that class. The repository has already paid for this lesson once
(`run.mjs:959-964`: A1 V06b made a `SECURITY DEFINER` function a pgcrypto member "and every layer stayed
green"; batch 128 added a rule that reads exactly those members). R1 is that shape with `SECURITY INVOKER`,
which the existing third rule does not read. Separately, §8.1/1's headline "only the pinned producer set
inserts an audit row" is still not held against a rewrite rule (N2): this is not new in this round, but it
is the remaining member of the class F2 named.

## 5. Claims checked

| claim | where | verdict |
|---|---|---|
| `open_blockers[195]` appended, old text a strict prefix, 196 others byte-equal, line count unchanged (so the coverage map's pins need no move) | `a35a619` message, plan §6, handoff, A0's done list | **true** (197 entries both sides; only index 195 differs; prefix true; +2842 chars; only `open_blockers` changed; 460 lines both sides) |
| integrity manifest regenerated, 90 digests | A0's done list, plan §6.4 | **true** (90 entries) |
| cherry-picks `42cdab1→98cc81c`, `89ee445→3720c85`, `8edc15a→ba4c654` with `-x` | plan §6.1, PR body | **true** (`3720c85` carries "cherry picked from commit 89ee445…") |
| policy literals unchanged; no migration; nothing a DB layer reads changed | `a35a619` message | **true** (diff stat: two RFCs, plan, three reviews, handoff, manifest, integrity manifest; no `WITH CHECK` line changed) |
| `userObject`, `NON_SYSTEM_SCHEMA`, `FIRST_NORMAL_OID`, `PINNED_TABLE_TRIGGERS`, `PINNED_TRIGGER_PROBE_SQL` exist as cited, and the trigger probe reads `app`/`private` only | RFC-026 §8.1/1 | **true** (`run.mjs:485-487`, `:1194`, `:1206`) |
| `021_member_scope.sql:448-450` admits a page by its business; ERD `:455` is the replay-anomaly row; `011:339-341` roster is owner/admin only | RFC-026 §3.3/3, §3.7; RFC-027 §5/6 | **true** |
| "on a clean `migrate-clean` it selected nothing, out of 18 functions in scope (`app`, `private`, `auth`)" | RFC-026 `:568-569`, plan §6.3 r1 | **selected nothing: true; 18: not at the rule's read point** — N4 |
| Q-026-10 option (i) "expressible under the command policy above as written", "naming the attempted id" | RFC-026 `:333-334`, `:715` | **policy: true; naming the id: not on `140`'s columns** — N3 |
| `verify-branch-scope` 0 (12 paths), `check:handoff` 0, `verify` 0 (685) on the branch name | PR body, handoff | **true** (§1, re-measured) |
| the handoff's final-head gates are "recorded in the PR body and plan §6.4" | handoff `tests` | **PR body: true** (lines 77-79); plan §6.4 lists the commands and says "exit codes in the handoff" — circular, N5 |
| PR #179 Draft, OPEN, not merged, head `eaf92dd` | A0's done list | **true** (`gh`, 2026-10-05) |
| CI on `eaf92dd` | merge bar | `bootstrap` run 37223567906 **in progress** when measured; not yet green |

## 6. Findings

Grades: CRITICAL / HIGH / MEDIUM / LOW / INFO. **None is stop-the-line**: nothing in this batch is
executable; the drifts above are defective-migration shapes against Proposed lint text that does not exist
yet, and no grant, policy, role, migration or CI file changed.

| id | grade | finding | where | remedy, and owner |
|---|---|---|---|---|
| N1 | **MEDIUM** (design; newly opened by this round's text; measured, R1) | §8.1/1 now skips "the members of an extension (`pg_depend.deptype = 'e'`), which no migration body writes". A migration body can make any function a member with one `ALTER EXTENSION … ADD`. R1 — a `SECURITY INVOKER` function in `public` inserting into `app.audit_logs`, added to pgcrypto — migrated clean (exit 0, every existing probe green) and is selected by the revised (a) only when the exception is removed. So (a)'s "exact producer set", (b), (c) and (e) all skip it, and (e) would admit a trigger outside `app`/`private` running it. This is the bypass `run.mjs:959-964` records (A1 V06b) and batch 128 closed for `SECURITY DEFINER` only | `RFC-2026-026:494-500`; `scripts/db/run.mjs:959-964`, `:997-1011` | Before RFC-026 is approved: do not exempt extension members wholesale. Either read them too (pgcrypto's and plpgsql's members name no audit table; a false positive goes to a pinned list), or exempt only a pinned set `(extension, member identity)` measured on the clean tree and refuse any member outside it (the shape of `EXTENSION_DEFINER_FUNCTIONS`, for every member regardless of `prosecdef`). Add R1 as a ninth drift. A0 writes; Q0 checks the drift |
| N2 | **MEDIUM** (design; not new in this round, residual of F2's class; measured, R2) | §8.1/1 reads functions and triggers; a **rewrite rule** is neither. A rule on a table outside `app`/`private` (the rewrite-rule probe reads those two schemas only, `run.mjs:1928-1945`) that a producer or the worker writes runs its action as the table's owner: R2, `on insert to public.a1r_rule_target do also insert into app.audit_logs`, migrated clean and, when `app_command` inserted one row into that table, wrote a `succeeded` audit row with a forged `actor_id`, past the forced RLS, although `app_command` itself cannot reach schema `app`. That is a database-side producer, which answer B and §3.1 say never exists, and nothing in (a)-(e) reads it | `RFC-2026-026:490-548`; `scripts/db/run.mjs:1928-1945` | Before RFC-026 is approved: add (f) — no rewrite rule on any relation in any `userObject` schema other than a view's `_RETURN` (or: whose `pg_get_ruledef` names an audit table or a producer), reading `pg_rewrite` whole — or widen the rewrite-rule probe to `userObject` and cite it, as (d) cites the trigger probe. Add R2 as a drift. A0 writes; Q0 checks |
| N3 | **LOW** (text; read, `140`'s columns) | Q-026-10's option (i) is put to the Owner as "a command event in a workspace the actor *can* reach naming the attempted id, … expressible under the command policy above as written". The policy admits such a row, but `app.security_events` has no column that can name an attempted workspace id: its columns are `workspace_id`, `occurred_at`, `event_type`, `actor_kind`, `actor_id` and two 32-byte digests, and `event_type`'s grammar `^[a-z0-9_]+(\.[a-z0-9_]+)+$` excludes a uuid's hyphens. So option (i) as described also needs a forward migration of batch `140` (A1's), or records the attempt without the id. The question understates that option's cost | `RFC-2026-026:333-335`, `:715`; `140_audit.sql:583-617` | In the text that puts Q-026-10 (before it is answered): say that naming the id needs a column `140` does not have (a forward migration in A1's range), or that (i) records the attempt without it. A0 writes; A1 and the Owner decide |
| N4 | **INFO** (measured, r3) | "on a clean `migrate-clean` it selected nothing, out of 18 functions in scope (`app`, `private`, `auth`)": after `migrate-clean` alone the non-extension `userObject` functions are **14** (`app` 9, `private` 4, `auth` 1); 18 is the count after `rls-smoke`, which adds `private.as_anonymous`, `as_user`, `as_suspended_user`, `as_service`. Plan §6.3 r4 already says those four come after the rule's read point; the RFC's sentence does not | `RFC-2026-026:568-569`; plan §6.3 | When next edited: "14 at the rule's read point". A0 |
| N5 | **INFO** (read) | The handoff says the final-head `check:handoff`/`verify`/scope results are "recorded in the PR body and plan §6.4"; plan §6.4 lists the commands and says "exit codes in the handoff". The PR body carries them (0/0/0, 12 paths, 685), and I re-measured them (§1). The same shape as C0-RT-5 (a), smaller | handoff `tests`; plan §6.4 | None needed for merge; drop the plan §6.4 reference next time. A0 |

## 7. Stop-the-line and merge

**Stop-the-line: no.** No secret, tenant leak, lost job, migration divergence or contract mismatch is in the
diff; both RFCs stay Proposed, no policy literal changed, and nothing is executable. R1 and R2 are
defective-migration shapes measured against a lint rule that does not exist yet; on `main` today neither
exists.

**Merge:** from the security side nothing blocks merging this Proposed text. My F1 — the one I asked to be
corrected before merge — is corrected faithfully: §10.1 no longer records an answer the Owner did not give,
and Q-026-10 is open with the options stated. N3 should be fixed in the text before Q-026-10 is put to the
Owner (it can ride this branch or the next edit); N1 and N2 must be resolved before RFC-026 is **approved**,
not before this merge. The merge bar of 127 §6 still needs a **green CI run on `eaf92dd`**: `bootstrap`
(run 37223567906) was in progress when I measured, so that condition is unverified here.

## 8. Limits

- §8.1/1 does not exist; I approximated its revised (a) with a regular expression over
  `pg_get_functiondef`, not the repository's lexer. N1 and N2 are about which objects the text tells the
  rule to read (extension members, `pg_rewrite`), which the lexer does not change.
- R2 ran with the migration owner as a superuser (the throwaway cluster's `postgres`). On a platform where
  the table owner lacks `BYPASSRLS`, the forced RLS on `app.audit_logs` would apply to the rule's action and
  the row would need a policy admitting the owner; the gap in the rule text is the same either way.
- I did not re-execute my round-one prototypes (the literals are unchanged, §2), re-run A0's r1-r4 drifts,
  Q0's drifts, the RFC-027 §6/6 census, or re-check C0's and Q0's findings beyond the text that answers them.
- CI on `eaf92dd` was in progress, not green, when measured.
- Same vendor and model family as the Author (§0).
