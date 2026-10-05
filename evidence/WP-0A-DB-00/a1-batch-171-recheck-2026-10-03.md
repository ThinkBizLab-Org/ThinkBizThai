# A1 security re-check: batch 171's review round (migration 171, RFC-2026-027 lifecycle visibility)

- **Package:** `WP-0A-DB-00`. **Role:** independent Security/Privacy reviewer, run `/claude/a1_bastion`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-171` (PR #181, Draft, OPEN, not merged; required check
  `bootstrap` IN_PROGRESS on the head when read at the end of this run), head `cf9d1de`
  (`cf9d1de748879b7ce2375d7fd5c80f8a5a537ac1`) over code `155412a`
  (`155412ad8e2364d4468415977381a79833c5bca9`), base `700715e` (main). Author `/claude/a0_atlas`. Previous
  reviewed head `d3ffe6a`; my record of it is `a1-batch-171-security-review-2026-10-03.md` (cherry-picked here as
  `4c31d11`, byte-identical to `ff844b4`).
- **Scope:** NARROW. The review round's corrections (`d3ffe6a..cf9d1de`), my own findings F1-F6 first, and the
  questions asked, re-measured on fresh clusters.
- **Checked out as:** local branch `recheck/a1-batch-171` at `cf9d1de`, in this run's own worktree
  (`wf_c2446fc0-562-7`). For `verify-branch-scope`, `check:handoff` and `verify` I checked out the branch NAME
  `agent/claude/WP-0A-DB-00-batch-171` in the same worktree (`--ignore-other-worktrees`; `git rev-parse
  --abbrev-ref HEAD` printed that name, the ref was `cf9d1de`), committed nothing there, and switched back to
  `recheck/a1-batch-171` before writing this file.
- **Status:** this file records findings. It advances no status and approves nothing: not batch 171, not its
  review round, not RFC-2026-027, not RFC-2026-026, not the SLO ratification, not the number 171, not the
  closure of `open_blockers[53]` or `[95]`. It fixes nothing.

## 0. What I am

I am a subagent started by a workflow of `/claude/a0_atlas`, the Author of this batch, of the same vendor and
model family as the Author, as the drafter of RFC-2026-027 and as the Author's other role runs. Under
RFC-2026-024 that is the stated independence limit of this role run. Accepting this record as the A1 role's
signature is the Integration Owner's and the Product Owner's act, not mine. Like my first record on this batch,
it is a findings record and accepts nothing; the review round now says so of that first record (§2, F1).

## 1. Measured and read

**Measured.** Node `v24.20.0` (`node -v` read before every measured run, `/Users/bank/.local/node-v24.20.0/bin`
first on PATH). PostgreSQL 17.11, throwaway clusters on 127.0.0.1:5501 only, TCP only
(`unix_socket_directories=''`), `initdb --locale=C -A trust -U postgres`, `LC_ALL=C`,
`db/foundation/ci/supabase-shim.sql` first, re-initdb every round and every drift, private directory `a1-171r2/`
under the session scratchpad. `DB_TEST_URL=postgresql://postgres@127.0.0.1:5501/postgres`.

| run | result |
|---|---|
| r1, r2: two fresh clusters, `make db-migrate-clean` then `make db-rls-smoke` | each: migrate-clean exit 0 ("post-migrate pass: 52 apply-time blocks, 38 re-run as written, 14 superseded and replaced"); rls-smoke exit 0, **1129 isolation cases**, **7 proofs** |
| r1, the lifecycle proof's lines | for each of `access_blocked`, `purge_queued`, `held`, `purging`, `verify`, `deleted`: gate 0 businesses (want 0), case 8 (011's body restored) 4 (want 4), case 11 (policy conjunct removed) 0 (want 0) |
| r1, the §6.1 proof | prints both pinned expressions (app_authz on `workspace_members`, and on `workspaces`) |
| r1, my catalog-wide read sweep, write sweep, oracle probe and `app_authz` probe (the same SQL as my first record, §2.1-§2.3) | output **byte-identical** to the `d3ffe6a` round (`diff` empty for all four) |
| r1, families empty in active, per active member of A (my own SQL over the 40 families of `LIFECYCLE_MEMBER_FAMILY`) | owner: `workspace_member_scopes`; editor (one of two): `billing_subscriptions, quota_buckets, workspace_invitations, workspace_members`; viewer: those and `notifications`; the second editor, the approver: those and `notifications`; the admin: `billing_subscriptions, notifications, workspace_invitations` |
| r1, census of `app` policies with 171 (6)'s widened role test | 210 policies; 91 permissive policies a client role reaches, 0 TO PUBLIC, 0 TO anon; 89 on workspace-scoped tables; exactly 3 without a helper call, the three exempt pairs. `authenticated` and `anon` are members of no role |
| six drifts appended to `140_audit.sql`, one per fresh cluster, restored byte for byte after each | §3 |
| `node scripts/verify-branch-scope.mjs 700715e WP-0A-DB-00` on the branch name | exit 0: "all 30 changed path(s) are declared, and every amendment explains one" |
| `npm run check:handoff` on the branch name | exit 0: "describes the branch: nothing substantive after its cited head" |
| `npm run verify` on the branch name | exit 0: "tests 685, pass 685, fail 0, skipped 0, todo 0" |
| `gh pr view 181` | OPEN, Draft, head `cf9d1de`, not merged, `bootstrap` IN_PROGRESS |
| cherry-picks | `git diff` of each review record between its review commit and its cherry-pick (`b450465`/`52296f6`, `ff844b4`/`4c31d11`, `4271532`/`93a0960`) is empty; each cherry-pick touches its own record only; `cf9d1de` touches the handoff only |

**Read:** `CONTRIBUTING_AGENTS.md`; plan §3 and §8 (`a0-batch-171-plan-2026-10-03.md`); the disposition's diff
(`product-owner-disposition-2026-10-03-batch-171.md`); the code commit's message; `git diff d3ffe6a..155412a`
for the migration, `authz-proofs.mjs`, `run.mjs`, `isolation-cases.mjs`, the two RFCs and the manifest; the
handoff's diff (`155412a..cf9d1de`); `product-owner-disposition-2026-10-03-batch-rfc-026-static-rule.md`
lines 17-21, 42-46 and 125 (the record disposition §1 now cites); `131_billing_projection.sql` for the "130"
correction (0 calls of either helper).

**Not measured:** CI on `cf9d1de` (in progress); the provisioned instance; 171 applied by a non-superuser
migration owner (`[198]` (2)); the revert-171 sensitivity run (done on `d3ffe6a`; the round changes no gate
logic, only the apply-time block, the proof's state loop, a before-read and text, and my sweeps are
byte-identical, so I did not repeat it).

## 2. My earlier findings, re-checked

| finding (on `d3ffe6a`) | what the round did | verdict |
|---|---|---|
| **F1** Low: RFC Status lines and D1 counted batch 171's A1 run as A1's review | Both Status lines (`RFC-2026-027:3`, `RFC-2026-026:3`) and D1 now name the runs of rfc-026-027, rfc-text and rfc-026-static-rule, cite my first record by path as "a findings record that accepts nothing", keep the acceptance owed, and add a `Revised:` line each. Diffstat: RFC-026 +2/-1 (Status, Revised), RFC-027 +3/-2 (Status, Revised, Author), as the Revised lines state | **Resolved** (read) |
| **F2** Low: 171 (6) saw TO authenticated only and exempted by name alone | `171_workspace_lifecycle_visibility.sql:315-323`: `0 = any (polroles)` or `authenticated` or `anon`; three `(relname, polname)` pairs. The two gaps I named by reading (another foreign key; a non-binding helper call) are recorded in the comment (`:306-308`) and `[198]` (6) | **Resolved** for PUBLIC, anon and the name key (e1, e2, e3, e6 measured); the residual is recorded and measured held (e5); one further gap not named (R1) |
| **F3** Low: 171's header named `policy-set.json` as pinned in the same diff | `:57-63`: the sentence drops it and says why (`PERMISSIVE_POLICIES` in `run.mjs`); neither `policy-set.json` nor `retention-map.json` is in `700715e..cf9d1de` | **Resolved** (measured: `git diff --name-only`) |
| **F4** Low: `[53]`, `[95]` closed before integration and the instance | Both now read "CLOSED ... IN THE MIGRATION SET, WHEN 171 IS INTEGRATED; ON THE PROVISIONED INSTANCE THE GAP STAYS OPEN UNTIL 011 AND 171 ARE APPLIED THERE" (`work-packages/WP-0A-DB-00.json:308`, `:350`); disposition §4 says the same | **Resolved** (read) |
| **F5** Info: RFC-2026-020's text not edited | unchanged, outside `writable_paths`; owed on `[195]` (b) | **Carried**, correctly recorded |
| **F6** Info: no non-superuser apply measured | unchanged; owed on `[198]` (2) | **Carried**, correctly recorded |

## 3. Drifts (appended to `db/foundation/migrations/140_audit.sql`, fresh cluster each, restored byte for byte)

Every drift is the same ungated join on `app.workspace_settings` (`exists (select 1 from app.workspace_members m
where m.workspace_id = workspace_settings.workspace_id and m.user_id = (select auth.uid()) and m.status =
'active')`), varied in role or in name. After each: `cmp` against the saved copy, identical; sha256
`2ac596bb…c1ad37149` at the end, the same as on `d3ffe6a`.

| drift | migrate-clean | refused by |
|---|---|---|
| e1 TO PUBLIC (my d5 on `d3ffe6a`, then refused only by pins) | exit 2 | **171 (6)**: "...reads membership without the helper, so the lifecycle gate does not reach it: workspace_settings.a1r2_probe_public" |
| e2 TO authenticated, named `workspace_members_select_own_active` (an exempt name borrowed on another table) | exit 2 | **171 (6)**: "...: workspace_settings.workspace_members_select_own_active" |
| e3 TO anon | exit 2 | **171 (6)**: "...: workspace_settings.a1r2_probe_anon" |
| e4 TO `a1r2_client`, a new role granted to `authenticated` | exit 2 | **not 171**: 171 applied; refused by the permissive policy probe ("unlisted or changed: app.workspace_settings.a1r2_probe_member"), the client membership probe ("authenticated -> a1r2_client") and the pinned grant probe (R1) |
| e5 TO authenticated, `app.is_active_member(workspace_id) or <the ungated join>` (a helper call that does not bind) | exit 2 | **not 171**: 171 applied; refused by the permissive policy probe and the policy set probe, as `[198]` (6) states |
| e6 TO authenticated, the ungated join (my d1, as a regression) | exit 2 | **171 (6)**: "...: workspace_settings.a1r2_probe_ungated" |

The plan's §3 claims (TO PUBLIC, TO anon, borrowed name, original, each refused by 171 (6)) reproduce.

## 4. The questions asked

**Does every family refuse members of a workspace in each of the six blocked states?** Yes, measured on r1 and
unchanged from `d3ffe6a`. My sweep reads the catalog, not a list: 41 relations `authenticated` can read (39
workspace-scoped tables, `workspace_member_scopes`, `user_profiles`; no view, no matview; `anon` reads nothing).
In each of the six blocked states every relation returns 0 to every member of A (owner, admin, approver, two
editors, viewer, suspended viewer) except `app.user_profiles` (1, own profile) and `app.workspace_members` (1,
own row). **Billing** (`billing_subscriptions`, the one client-readable billing table): 1 for the owner in active,
0 in every blocked state. **Audit** (`audit_logs`, `security_events`): no client grant at all. **Approvals**
(`approval_policies`, `approval_requests`, `approval_events`): 3-5, 3-5, 1-2 in active, 0 in every blocked state.
Active and closing: identical. No count differs between blocked states. No error.

**Does the own-membership row stay visible?** Yes: the owner sees self + 6 others in active/closing and self only
in each blocked state (oracle probe, byte-identical to `d3ffe6a`).

**Can app_authz's new read recurse or widen access?** No, measured: no 42P17 or stack-depth error across 8 states
x 7 members x 41 relations, the 1129 cases or the proofs; as `app_authz` with the owner's claims,
`app.workspaces` returns 1 in active/closing and 0 in the six, `select name` is 42501. The round did not touch
the `app_authz` policies, grants or helper body (`git diff d3ffe6a..155412a` changes 171 only in its header and
block (6)).

**Can any client set lifecycle_state, or reach a blocked workspace through a definer function, a view or another
family's join?** No, measured, unchanged: `authenticated` holds UPDATE on `app.workspaces (name, updated_by)` and
no INSERT; the write sweep finds no update but a member's own `user_profiles` row in blocked states; the only
client-executable SECURITY DEFINER functions are the two helpers; no view exists; every client permissive
policy on a workspace-scoped table but the three exempt pairs calls a helper (census).

**Anything newly opened?** Nothing. The round's code changes are an apply-time block that refuses more (e1, e3)
and keys on more (e2), a proof loop over six states instead of one, a stricter before-read, and comments.
The census shows no shipped policy newly caught by the widened block (0 TO PUBLIC, 0 TO anon).

## 5. Findings

No finding is stop-the-line. None is a tenant leak, secret exposure or migration divergence.

**R1 — Low (defence in depth; not recorded).** 171's block (6)
(`db/foundation/migrations/171_workspace_lifecycle_visibility.sql:315-317`) tests the policy's role list for
PUBLIC, `authenticated` or `anon` literally; it does not follow role membership. Measured (e4): a policy TO a new
role that `authenticated` is granted passes block (6), and migration 171 applies. It is refused today by three
other layers (the permissive policy probe, the client membership probe, the pinned grant probe), so nothing
escapes. But the comment at `:299-308` ("Every permissive policy a client role reaches") and `[198]` (6)
(`work-packages/WP-0A-DB-00.json:453`) list what the block still does not see, and this case is not among them.
*Remedy:* while 171 is not integrated, either test `pg_catalog.pg_has_role('authenticated', r.oid, 'MEMBER')` /
`('anon', ...)` for each role in `polroles`, or add "a policy TO a role a client role is a member of, held by the
client membership and pinned grant probes" to the comment and to `[198]` (6). After integration only the
`[198]` record can change.

**R2 — Informational (comment accuracy).** `tests/db/identity/isolation-cases.mjs:19648-19650` says the roster
and invitations are "the owner's and admin's"; measured, the admin of A reads no `workspace_invitations` row in
active either (fixture, not role). Nothing asserts on the admin, so no case is weakened. *Remedy:* none needed;
if the comment is touched, say "the owner's (and by role the admin's)".

**R3 — Informational (the delegation; not this role's to decide).** Disposition §1 now records that the reach of
the Owner's words of 2026-10-05 to D1-D3 is A0's reading and that the Owner's confirmation is owed
(`[195]` (e)). I checked the record it cites: `product-owner-disposition-2026-10-03-batch-rfc-026-static-rule.md`
lines 19-21 and 44 say the summary the Owner answered that day recommended nothing on item 3 (the SLO), and its
last section (line 125) names the three acts as "A0's standing recommendations" after the words. The new
wording is accurate. Whether a reading-pending-confirmation suffices for RFC-2026-027's approval, on which
171's being in effect rests, is the Owner's and the Integration Owner's question.

## 6. Claims checked

| claim (commit message, plan §3/§8, disposition, blocker edits, handoff) | verdict |
|---|---|
| migrate-clean and rls-smoke green twice, 1129 cases, 7 proofs, 52/38/14 | TRUE (r1, r2) |
| four drifts (TO PUBLIC, TO anon, borrowed name, original) each refused by 171 (6) | TRUE (e1, e3, e2, e6) |
| cases 8 and 11 in all six blocked states; gate 0, case 8 = baseline (4), case 11 0 | TRUE (r1 proof lines) |
| the §6.1 proof prints both pinned expressions | TRUE |
| editor 4 / viewer 5 / owner 1 families empty in active, as named | TRUE (my own query; it is the editor `user_editor_a`, whose before-read passes; the second editor also lacks `notifications`) |
| census 91 / 0 PUBLIC / 0 anon / 89 / same 3 without a helper | TRUE |
| `[198]` (6): the block does not see another foreign key or a non-binding helper call; pins hold them | TRUE for the helper call (e5); the foreign-key case by reading; incomplete (R1) |
| "131 carries no helper call (0 matches)" | TRUE (0 matches of either helper call) |
| header no longer lists `policy-set.json`; rationale no longer says `retention-map.json` moved; neither is in the diff | TRUE |
| `[53]`, `[95]` qualified to the migration set; open on the instance | TRUE (text) |
| RFC Status lines and D1 no longer count batch 171's A1 run; `Revised:` lines; "No other sentence of this file changed" | TRUE (diffstat and word diff) |
| D4 and `[195]` (a) name A1 Security for the number; RFC-027's Author line | TRUE (text; ERD:282 not re-read here) |
| cherry-picks with `-x`, byte-identical records | TRUE |
| `cf9d1de` is the last commit and touches the handoff alone; `head_revision` = `155412a` | TRUE |
| verify-branch-scope 30 paths exit 0; `npm run verify` / `check` 685 pass; `check:handoff` exit 0 | TRUE (branch name) |
| pushed `d3ffe6a..cf9d1de`, PR #181 Draft, not merged | TRUE as to the PR's head, state and draft flag |
| "cleanup: cluster on 5507 stopped" | not checked (another run's port; not touched) |

## 7. Stop-the-line and merge

**Stop-the-line: no.** Nothing measured leaks a tenant's data, exposes a secret, duplicates a side effect, loses
a job, diverges a migration or deletes irreversibly. The round narrows nothing that was held and opens nothing.

**Does anything block the merge?** Not from this re-check's findings: R1 is Low and held by three layers, and is
best fixed or recorded before integration because 171's text freezes then; R2 and R3 are informational. What
blocks a merge today is outside them: `bootstrap` on `cf9d1de` was IN_PROGRESS when read; C0's and Q0's
re-checks of this round; the Integration Owner's evidence (`[188]`); the named-role acceptances (`[194]`,
`[195]` (a)); and, for the Owner and the Integration Owner to weigh, the Owner's confirmation of the delegation's
reach (`[195]` (e), R3).

## 8. Limits

- Same vendor and model family as the Author (§0); this is not the independent human A1 acceptance the
  repository asks for.
- Narrow: only the round's corrections and the questions asked were re-checked; the rest of my first record
  stands on its own measurements of `d3ffe6a`.
- All measurement is on throwaway local clusters as superuser, never on the provisioned instance.
- The foreign-key gap of block (6) is by reading; no such table exists today to drift.
- Cleanup: the cluster on 5501 was stopped and its data directory removed (`pg_isready`: no response);
  `140_audit.sql` was restored byte for byte after every drift; nothing outside this worktree and the private
  directory `a1-171r2/` was written; nothing was pushed.
