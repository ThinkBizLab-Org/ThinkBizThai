# A1 security re-check: batch rfc-026-027's review round

- **Package:** `WP-0A-DB-00`. **Role:** independent Security/Privacy reviewer, run `/claude/a1_bastion`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-rfc-026-027` (PR #174, Draft, open, not merged),
  head `80c171f` (`80c171fc9bbd6051fb1e8b37c0b708dd3f4da50f`) over code `b6d65e1`
  (`b6d65e1592cd88757668f734ac53376dd7730f44`), base `f3e6fbc` (main). Author `/claude/a0_atlas`.
  Previous reviewed head `e64e1f5`; my earlier record is
  `a1-batch-rfc-026-027-security-review-2026-10-03.md` (cherry-picked as `b66a868`).
- **Scope:** a NARROW re-check of the review round `e64e1f5..80c171f`: my own findings first, then the
  questions put to this run. Not a fresh review of the whole batch.
- **Checked out as:** local branch `recheck/a1-batch-rfc-026-027` at `80c171f`, in this run's own
  worktree. For `verify`, `check:handoff` and branch scope I measured on the branch NAME in a private clone
  (`a1-rfc-026-027r2/repo`): `agent/claude/WP-0A-DB-00-batch-rfc-026-027` created there at `80c171f`
  (`git rev-parse --abbrev-ref HEAD` printed that name), `origin/HEAD` set to `origin/main` = `f3e6fbc`.
  Nothing was committed in the clone.
- **Status:** this file records findings. It advances no status, approves nothing (neither RFC, no
  question of RFC-026 §10 or RFC-027 §10), and fixes nothing.

## 0. What I am

I am a subagent started by a workflow of `/claude/a0_atlas`, the Author of this batch, and the same
vendor and model family as the Author, the drafter of both RFCs and the writer of the review round.
Under RFC-2026-024 that is the stated independence limit of this role run. Accepting this re-check as the
A1 role's signature is the Integration Owner's and the Product Owner's act, not mine. I also wrote the
F2-b remedy the review round adopted; §3 finds that remedy insufficient, so on that point I am reviewing
my own earlier advice.

## 1. Read and measured

**Read:** `CONTRIBUTING_AGENTS.md`; my earlier record; the five review-round commit messages
`e64e1f5..80c171f`; `git diff e64e1f5..80c171f` (both RFCs, plan §7 in full, disposition §7, the manifest
hunk, the integrity manifest hunk, the handoff additions); `git diff f3e6fbc..80c171f --stat`;
`RFC-2026-020` `:3`, `:393-411`, `:444-449`, `:476` (the sentences RFC-027 §3.4 quotes);
`RFC-2026-023` §3.2 (the acting-user helper's stated semantics); `021_member_scope.sql:389-490`
(the scope helpers); `011_authorization_helpers.sql:257-300`; `010_identity.sql:150-157`, `:400-404`,
`:500-517`; `pinned-grants.json:221`.

**Measured.** Node `v24.20.0` from `/Users/bank/.local/node-v24.20.0/bin` (`node -v` printed before
every measured run; the PATH Node 26 was not used). PostgreSQL 17.11 from `/opt/homebrew/bin`, port
**5501** on `127.0.0.1` only, `unix_socket_directories=''`, `initdb --locale=C -A trust -U postgres`,
`LC_ALL=C`, re-initdb before every round, shim first. The cluster was stopped and its data directory
removed at the end; nothing listens on 5501. No other port was touched. No repository file was edited
for any measurement; every prototype ran by `psql` against a freshly migrated scratch cluster inside a
transaction that was rolled back (the reason, as in my earlier record §1: RFC-027's policy makes `011`'s
"exactly one policy" apply-time block false, so appending it to `140_audit.sql` measures the pin, not the
design). No drift was owed: nothing a probe or pin holds changed.

| command | where | exit | result |
|---|---|---|---|
| `node scripts/verify-branch-scope.mjs f3e6fbc WP-0A-DB-00` | clone, on the branch name | **0** | "all 16 changed path(s) are declared, and every amendment explains one" |
| `npm run check:handoff` | clone, on the branch name | **0** | "describes the branch: nothing substantive after its cited head" (a first run with the clone's `origin/HEAD` pointing at my worktree's branch exited 91 for that reason; re-run after `git remote set-head origin main`) |
| `npm run verify` | clone, on the branch name | **0** | "clean: exit 0 — tests 684, pass 684, fail 0, skipped 0, todo 0" |
| round r1: shim, `make db-migrate-clean`, `make db-rls-smoke` | worktree at `80c171f`, 5501 | 0, **0**, **0** | "post-migrate pass: 50 apply-time blocks, 38 re-run as written, 12 superseded and replaced"; "db-authz-proofs: ok — 6 claim(s) discharged by execution" |
| r1: `lifecycle-probe.sql` (7 forms × 8 states), `lifecycle-probe-2.sql`, `rfc027-probe.sql` (baseline) | 5501 | 0, 0, 0 | §2 |
| round r2: shim, `make db-migrate-clean`; `rfc026-proto-v2.sql` | 5501 | 0, 0, 0 | §3 |
| round r3: shim, `make db-migrate-clean`; `rfc027-cases.sql` | 5501 | 0, 0, 0 | §4 |
| `open_blockers` by script (`blk.mjs`) | worktree | — | 196 entries at `e64e1f5` and at `80c171f`; `[0]`-`[194]` equal; `[195]` at `80c171f` has the `e64e1f5` text (5170 chars) as a strict prefix (now 9046); no other manifest key changed; every `open_blockers[i]` still on line 256+i (0 misses) |
| cherry-pick fidelity | git | — | `git diff 369c495 b55f0e1`: empty; `git diff c276e01 b66a868` and `git diff f91294e 54ad956`: only the other role runs' added files, so each role-run file is byte-identical to its original |
| PR and CI | `gh` | — | #174 Draft, OPEN, not merged, head `80c171f`, remote branch at `80c171f` (`e64e1f5` is its ancestor: no force); check `bootstrap` SUCCESS, run 37176358037; body ends with the Generated-with line |

## 2. The `lifecycle_state` finding, re-measured at `80c171f`

`lifecycle-probe.sql`, round r1. Synthetic owner O owns W1 and W2, is an editor of W3; P owns W4; M is
an editor of W1. As `authenticated` with O's claims, each form for each of the eight states, rolled back
after each attempt. I added two forms to my earlier set (`where true`, `returning 1`).

| form | `active`, `closing` | the six blocked states |
|---|---|---|
| `… where id = W1` | admitted, 1 row | **42501** "new row violates row-level security policy for table \"workspaces\"" |
| `… returning id` | admitted | **42501** |
| `set lifecycle_state = case when id = W1 … end` | admitted | **42501** |
| PostgREST-shaped CTE with `where id = W1` | admitted | **42501** |
| no `WHERE`, no `RETURNING` | admitted, 2 rows | **admitted, 2 rows: W1 and W2 move; W3 (editor) and W4 (other tenant) untouched** |
| `where true` | admitted, 2 rows | **admitted, 2 rows**, same |
| `returning 1` (a constant) | admitted, 2 rows | **admitted, 2 rows**, same |
| CTE `returning 1`, no filter (`lifecycle-probe-2.sql`) | — | **admitted**: W1 and W2 to `deleted` |

After the unfiltered move to `access_blocked`: the owner's unfiltered `UPDATE … set lifecycle_state =
'active'` changed **0** rows (`workspaces_update_owner`'s `USING` carries `lifecycle_state in ('active',
'closing')`, `010_identity.sql:500`), so no client form undoes it; O sees 1 workspace (W3); M sees 0 W1
rows; `app.is_active_member(W1)` is still **true** for O and for M. `rfc027-probe.sql`'s baseline: in
all six blocked states the owner still reads W1's business and still `INSERT`s a Business into W1.

**Grade: MEDIUM, confirmed again** at the new head. Pre-existing on main since batch `010`; this batch
records it and changes no part of it.

**Stop-the-line: NO, today.** The actor is only the workspace's own active owner; no other tenant's
workspace moves; nothing is deleted because nothing reads `lifecycle_state` to act on it. It becomes
stop-the-line under either condition `open_blockers[195]` (4) now names: RFC-027's gate landing without
the revoke, or any job selecting workspaces by `lifecycle_state`. That entry, RFC-027 Q-027-5 and the
disposition §7 now say the revoke lands in whichever of those comes first. **F1-b is resolved.**

The measured qualification written into RFC-026 Q-026-5 (`:498`), RFC-027 Q-027-5 (`:428`) and
`[195]` (3) is TRUE, with one wording gap (C2, §5): "no `RETURNING`" understates it, because `RETURNING`
a constant reads no column and also moves every workspace.

## 3. RFC-2026-026 as revised: can a client forge, suppress or misattribute an audit row?

`rfc026-proto-v2.sql`, round r2: `grant insert on app.audit_logs to app_command`; §3.3's `WITH CHECK`
**as revised** (`RFC-2026-026:126-133`), verbatim but for the helper's name; a stand-in for
`RFC-2026-023` §3.2's `app.acting_user_admits_business` written to that RFC's stated semantics ("an
active member of `workspace` and (holds no scope row in it, or holds one covering `business`)", read as
the claims' subject); a command function in the revised §3.4 shape (the action in the exception block,
the `succeeded` `INSERT` after it); and a writer that inserts a chosen outcome and scope, to see what the
policy alone holds. `app.audit_logs` has **0** foreign keys (catalog). O owns W1 and is not narrowed;
M is an editor of W1 narrowed to B1; P owns W4 with business B4 and page P4.

| case | row | result |
|---|---|---|
| A | O, W1, correct command | `succeeded` |
| B | O, W4 (other tenant), correct command | **`denied` returned and written into W4's log** (F2-a, unchanged by design; Q-026-1 open) |
| C | O, `denied`, W4, B4 | **refused** 42501: my earlier case 9, inverted, now holds |
| D | O, `denied`, **own W1**, **B4** (another tenant's business) | **admitted** |
| E | O, `succeeded`, own W1, B4 | **admitted** |
| F | O, `denied`, own W1, no business, **P4** (another tenant's page) | **admitted** |
| G | O, `denied`, own W1, B1, P4 | **admitted** |
| H | O, `succeeded`, own W1, B4, P4 | **admitted** |
| I | O, `denied`, W4, no business, P4 | refused 42501 |
| J | M (narrowed to B1), `denied`, W1, B4 | refused 42501 |
| K | M, `denied`, W1, B1 | admitted |
| F2-c, earlier shape | `succeeded` audit row refused by an added restrictive policy; `INSERT` inside the block | **returns `denied`**, writes 1 `denied` row, 0 actions (misattributed outcome) |
| F2-c, revised shape | same refusal; `INSERT` after the block | **raises** `new row violates row-level security policy "a1_refuse_succeeded"`; since the call raises, nothing it wrote survives |
| §8.2/7 shape | the `succeeded` row violates `audit_logs_reason_key_form` | **raises** 23514; no action survives |

**Forgery of the actor:** unchanged and bounded (my earlier cases 6-8; the policy's actor terms did not
change). The residual is now stated in §3.3/1 and §11, and §8.1/6 confines `EXECUTE` on command
functions to `authenticated`. **F2-e resolved.**

**Suppression:** fail-closed holds in the revised shape, and an audit-write refusal is no longer recorded
as a user denial. **F2-c resolved, measured.** F2-f is stated in §3.4 and under Q-026-4: **resolved as
text** (reasoned, as before).

**Misattribution across tenants (F2-a):** unchanged by design. The RFC now states the measured cost in
§3.3/3, Q-026-1 is re-worded with both options and marked "to be answered before approval", and A0's
"accept the cost" is withdrawn in disposition §7. That is what I asked for: **F2-a is correctly held,
not resolved**; it still blocks RFC-026's approval.

**Misattribution of scope (F2-b): partly resolved; a new LOW finding, F4-a.** The revised policy refuses
a refusal row that names a scope in a workspace the caller cannot reach (C, I) and holds a narrowed
member's scope (J). It does **not** hold the relation between `workspace_id` and the scope ids, because
`RFC-2026-023`'s helper, like batch `021`'s `member_scope_admits_business` (`021:462-473`), answers
"is this member narrowed away from this business id?", not "does this business belong to this
workspace?". For an unnarrowed member, the usual case for an owner, it is true for any business id. The
first arm also never reads `page_context_profile_id`. So rows D-H are admitted. The RFC's text claims
more: §3.3/3 (`:159`) "cannot name another tenant's business or page"; §3.6 (`:239`) "a refusal row
cannot carry another tenant's business id"; §3.3/2 (`:147`) that the helper's page form applies where a
page id is present, which the literal policy does not call. §8.2/18 (`:463`), written with the caller's
own `workspace_id`, would go red against the RFC's own policy. My earlier F2-b remedy ("or <acting-user
helper admits the scope>") made the same mistake. The round adopted it in that shape, and the plan says
so (§7.2: "the clause is A1's remedy in shape").

## 4. RFC-2026-027 as revised

1. **The blocked-state set is complete.** The state list and §3.1/§3.2's SQL are unchanged in the round
   (only prose, quotations and cases changed). The CHECK's eight values (`010:156-157`) and §11.4's
   diagram, now quoted whole (`Verify --> PurgeQueued` included), admit `active` and `closing` only.
   My earlier eight-state measurement stands, and round r3 reproduces it for the owner (table below,
   "correct").
2. **No recursion and no widening:** the design is unchanged since my earlier §4.2-4.3 measurement; r3
   ran the policy and helper with `app_authz` and `authenticated` reads in all eight states with no
   `42P17` and no stack error.
3. **The new cases bite. Measured on Q0's two single-conjunct mutants** (`rfc027-cases.sql`, r3; the
   owner of W1 in each state; "green" means the case passes):

   | configuration | case 10 (direct read as `app_authz`) | case 1 (helper and one family) | case 11 (case 1 with the policy's conjunct removed) |
   |---|---|---|---|
   | §3.1 + §3.2 as written | green | green | green |
   | M4: policy's lifecycle conjunct removed | **red** (1 row in every blocked state) | green | green |
   | M3: helper's lifecycle conjunct removed (join kept) | green | green | **red** (member true, 1 business in every blocked state) |

   Case 1 alone kills neither mutant, which was Q0's F2. Cases 10 and 11 each kill one. **Q0-F2 is
   resolved in text, and the text is right.**
4. **No family escapes the helper:** the new static obligation §6/6 (`RFC-2026-027:359`) is the rule I
   asked for, owed to A0 in the batch that lands §4 and recorded in `[195]` (7). **F3-a resolved as
   text.** The census itself (91 permissive `authenticated` policies, 10 calling neither helper, all
   `010`'s) was not re-run: no migration changed.
5. **RFC-020 amendment text (C0-2):** each "now" quotation in §3.4 matches `RFC-2026-020` at `:3`,
   `:393-395`, `:407-410`, `:444-447`, `:448-449`, `:476` word for word (read). The Owner's approval
   words in the Status line are not rewritten; a sentence is appended. I find nothing in the amendment
   that widens `app_authz` beyond what §3.1 grants.

## 5. Findings

Grades: CRITICAL / HIGH / MEDIUM / LOW / INFO. **None is stop-the-line.** None is in the diff's code:
the round changes no migration, policy, grant, pin or lint rule.

### 5.1 My earlier findings

| id | earlier grade | now | evidence |
|---|---|---|---|
| F1-a | MEDIUM | **Open, correctly held as owed.** Re-measured at `80c171f` (§2); the revoke is a migration, waits on Q-026-5/Q-027-5, and `[195]` (4) requires the no-column-read case and the `pinned-grants.json:221` move | §2 |
| F1-b | MEDIUM | **Resolved** (`[195]` (4), Q-027-5, disposition §7) | §2 |
| F2-a | MEDIUM | **Held, not resolved; blocks RFC-026 approval.** Stated, Q-026-1 re-worded, A0's recommendation withdrawn | §3 case B |
| F2-b | LOW | **Partly resolved**; the rest is F4-a | §3 C, I, J vs D-H |
| F2-c | LOW | **Resolved, measured** | §3 F2-c rows |
| F2-d | INFO | Resolved (§5.1's parenthesis) | read |
| F2-e | INFO | Resolved (§3.3/1, §8.1/6, §11) | read |
| F2-f | INFO | Resolved as text (§3.4, Q-026-4) | read |
| F2-g | INFO | No change needed | — |
| F3-a | LOW | Resolved as text (§6/6), owed to the landing batch | §4.4 |
| C1 | INFO | No change needed | — |

### 5.2 New in this re-check

| id | grade | finding | where | remedy, and owner |
|---|---|---|---|---|
| F4-a | **LOW** (design, measured on a prototype) | The revised `WITH CHECK` does not hold the relation between `workspace_id` and the scope ids. A `denied` or `succeeded` row in the caller's own workspace can name another tenant's business or page (cases D-H) whenever the caller is unnarrowed, because the acting-user helper answers scope narrowing, not membership of the business in the workspace, and the first arm never reads `page_context_profile_id`. §3.6 itself tells a producer it may record the requested business on a denial "when the acting-user helper admits that scope", so a correct command reaches this. The text claims the policy prevents it (§3.3/3, §3.6, §8.2/18), and §3.6's heading ("checked by the producer … not by a policy") now contradicts its body. The impact is confined to the caller's own workspace's log and the caller's own actor id. Nothing is written to another tenant's scope and nothing about it is disclosed, but a consumer that selects audit rows by `business_profile_id` would see them | `RFC-2026-026:126-133`, `:147`, `:159`, `:227`, `:239`, `:463`; Q-026-2 (`:495`) | Before approval, pick one. (i) Refusal rows carry no scope: the second arm alone for `outcome <> 'succeeded'`, with the first arm restricted to `succeeded`, so §3.6's "unless admitted" clause goes. (ii) A definer helper checks the relation (business in workspace, page under business) in the policy; that widens a pinned grant and needs its own owner. Either way, call the page form where a page id is present, correct the three sentences and the heading, and write §8.2/18 with the caller's own `workspace_id` and another tenant's business, a case the current text fails. The `succeeded` arm's relation stays §3.6's copy-from-`RETURNING` and §8.2/17's to hold. This is Q-026-2's "policy-side check still owed?", answered by measurement. A0 writes; A1 decides as Q-026-2's owner |
| C2 | **INFO** | The measured qualification lists "no `RETURNING`" among the forms that read no column. `RETURNING 1` reads none and also moves every workspace (§2). The stated rule ("an `UPDATE` that reads no column") is right; the parenthetical example is narrower than it | `RFC-2026-026:498`, `RFC-2026-027:428`, `[195]` (3) | When next edited, read "no `RETURNING` of a column". The no-column-read isolation case owed by `[195]` (4) should include `RETURNING 1`. A0 |

## 6. Are the claims true?

- **TRUE:** the cherry-picks are `-x`, conflict-free and byte-identical (§1); the review round's commit
  `b6d65e1` touches no file under `db/` or `scripts/`: the `e64e1f5..80c171f` stat is two RFCs, plan,
  disposition, three role-run records, the integrity manifest (exactly the two RFC digests), the
  manifest's line 448 and the handoff. Nothing a database layer reads changed, so A0's decision not to
  run a live round was right; my r1 at `80c171f` is green regardless.
- **TRUE:** `open_blockers[195]` is a pure append; 196 entries; no line pin moved (§1). Items (3)-(7)
  say what the plan says they say.
- **TRUE:** disposition §7 is appended, records no new Owner words, answers nothing, and the question
  count is fifteen (Q-026-1..9, Q-027-1..6).
- **TRUE:** RFC-027 §3.4's quotations of `RFC-2026-020` are exact (§4.5); the diagram is quoted whole.
- **TRUE:** the commit messages of `b6d65e1` and `80c171f` describe their diffs; "nothing a database
  layer reads changes" holds.
- **TRUE, but too strong in one place:** plan §7.2's F2-b row says "a non-`succeeded` row only with both
  scope ids null unless the acting-user helper admits the scope". That describes the policy correctly.
  RFC-026 §3.3/3 and §3.6 then claim it keeps another tenant's business out, which F4-a measures false.
- **TRUE:** the handoff says the revised RFC-026 policy and the cases added in review were not executed,
  and asks for a C0 re-check. This run executed both on scratch clusters (§3, §4.3). That is evidence
  for the text, not `RFC-2026-020` §6.2's execution by the landing batch.
- **TRUE:** the PR is Draft and unmerged, the push was not forced, and CI is green on `80c171f`.

## 7. Verdict

- **Stop-the-line: NO.** The round changes two Proposed decision records, evidence, one appended
  blocker sentence and a digest manifest. The live defect it records (F1-a) is pre-existing, confined
  to an owner's own workspaces, deletes nothing today, and was re-measured so.
- **Nothing in this diff blocks the merge** from the Security/Privacy side.
- **What blocks approval of RFC-2026-026, not this merge:** F2-a (Q-026-1), Q-026-9 and F4-a (Q-026-2).
  **Of RFC-2026-027:** nothing new from this run. F1-a's revoke must land first among the three points
  `[195]` (4) names.
- I give no answer to Q-026-1, Q-026-2 or Q-026-9 here. This file supplies measurements.

## 8. Limits

- Same vendor and model family as the Author (§0). F4-a corrects a remedy I wrote myself.
- The prototypes are my code on scratch clusters, not the batches that will land. `RFC-2026-023`'s
  helper does not exist: the stand-in follows its §3.2 text and is owned by `postgres`, not `app_authz`.
  If the landed helper also checks the business's workspace, F4-a's business half closes and its page
  half does not, because the policy never passes the page.
- PostgREST was not run; the PostgREST-shaped statements are SQL in its shape.
- I did not re-run the `app` policy census, my earlier negative control, or A0's or Q0's drifts. No
  migration or pin changed.
- Private artefacts (not in the repository), under the scratchpad directory `a1-rfc-026-027r2/`:
  `round.sh`, `blk.mjs`, `wp_old.json`, `b195_added.txt`, `rfc027.diff`, `lifecycle-probe.sql`,
  `lifecycle-probe-2.sql`, `rfc027-probe.sql`, `rfc027-apply.sql`, `rfc027-negctl.sql`,
  `rfc026-proto-v2.sql`, `rfc027-cases.sql`, every round's logs (`r1`-`r3`), `scope.log`,
  `handoff.log`, `verify.log`, and the clone `repo/`.
