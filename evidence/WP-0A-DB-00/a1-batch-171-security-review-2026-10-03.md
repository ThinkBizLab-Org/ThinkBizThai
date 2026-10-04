# A1 security review: batch 171 (migration 171, RFC-2026-027 lifecycle visibility)

- **Package:** `WP-0A-DB-00`. **Role:** independent Security/Privacy reviewer, run `/claude/a1_bastion`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-171` (PR #181, Draft, OPEN, not merged; required check
  `bootstrap` IN_PROGRESS on the head when read at the end of this run), head `d3ffe6a`
  (`d3ffe6aa0a35d871281e6ca4bf7b31f63ec1c506`) over code `d6fbf5f`, base `700715e` (main). Author
  `/claude/a0_atlas`.
- **Checked out as:** local branch `review/a1-batch-171` at `d3ffe6a`, in this run's own worktree
  (`wf_c2446fc0-562-3`). For `verify-branch-scope`, `check:handoff` and `verify` I checked out the branch NAME
  `agent/claude/WP-0A-DB-00-batch-171` in the same worktree (`--ignore-other-worktrees`, because worktree
  `wf_c2446fc0-562-1` holds it; `git rev-parse --abbrev-ref HEAD` printed that name, the ref was `d3ffe6a` before
  and after), committed nothing there, and switched back to `review/a1-batch-171` before writing this file.
- **Status:** this file records findings. It advances no status and approves nothing: not batch 171, not
  RFC-2026-027, not RFC-2026-026, not the SLO ratification, not the migration number, and not any closure of
  `open_blockers[53]` or `[95]`. It fixes nothing.

## 0. What I am

I am a subagent started by a workflow of `/claude/a0_atlas`, the Author of this batch, and of the same vendor
and model family as the Author, as the drafter of RFC-2026-027 and as the Author's other role runs. Under
RFC-2026-024 that is the stated independence limit of this role run. Accepting this review as the A1 role's
signature is the Integration Owner's and the Product Owner's act, not mine. RFC-2026-027's Status line and the
disposition (D1) name "the role runs of batches ... and 171" as A1's review of the RFC: this file is that 171
run, it did not exist when those lines were written, and it is a findings record, not an acceptance (F1).

## 1. Read and measured

**Read:** `CONTRIBUTING_AGENTS.md`; the plan `a0-batch-171-plan-2026-10-03.md`; the disposition
`product-owner-disposition-2026-10-03-batch-171.md`; both commit messages; `git diff 700715e..d3ffe6a` for the
migration, `scripts/db/run.mjs`, the runner and case files, the two RFC Status lines, the manifest's blockers
`[53]`, `[95]`, `[194]`, `[195]`, `[198]`; RFC-2026-027 §1-§4 (governing); `010_identity.sql:520-630` and
`011_authorization_helpers.sql:257-276` (the objects 171 replaces). The Owner's words are checked only against
their earlier transcription on main (`product-owner-disposition-2026-10-03-batch-rfc-026-static-rule.md:116`),
not against the conversation itself.

**Measured.** Node `v24.20.0` (read before every measured run; see §6 for one discarded round). PostgreSQL
17.11, throwaway clusters on 127.0.0.1:5501 only, TCP only (`unix_socket_directories=''`),
`initdb --locale=C -A trust -U postgres`, `LC_ALL=C`, `db/foundation/ci/supabase-shim.sql` first, re-initdb every
round, private directory `a1-171/` under the session scratchpad. `DB_TEST_URL=postgresql://postgres@127.0.0.1:5501/postgres`.

| run | result |
|---|---|
| r2, r3, r4: three fresh clusters, `make db-migrate-clean` then `make db-rls-smoke` | each: migrate-clean exit 0 (52 apply-time blocks, 38 as written, 14 superseded and replaced); rls-smoke exit 0, **1129 cases**, **7 proofs** |
| r3, 171 reverted in place (010's five policies and 011's helper body restored, `workspaces_select_authz_own_open` dropped, the two columns revoked from `app_authz`), `make db-rls-smoke` without re-migrating | exit 2: **30 of 1129 cases fail**; proofs `lifecycle-gate-is-the-helpers-and-the-policys` and `catalog-satisfies-rfc-2026-020-6.1` fail. A0's "30 of 42 red with 171 reverted" holds |
| A1 read sweep (my own SQL, §2.1), r2 and again r3 reverted | r2: in all six blocked states no member of A reads a row of any of the 41 relations a client can read, but its own `user_profiles` row and its own `workspace_members` row. r3 reverted: 38 of the 41 still readable, so the sweep is sensitive |
| A1 write sweep (§2.2), r2 | in `access_blocked` and `deleted` no member of A updates any row but its own `user_profiles`; no client role holds DELETE anywhere |
| A1 oracle and `app_authz` probe (§2.3), r2 | as tabled there |
| §6/6 census, r4 | 91 permissive `authenticated` policies in `app`, 89 in scope, exactly 3 in scope without a helper (`workspaces_select_active_member`, `workspaces_update_owner`, `workspace_members_select_own_active`); 210 policies in `app`. Matches plan §2 |
| eight drifts appended to `140_audit.sql`, one per fresh cluster, restored byte for byte after each (`cmp` against a saved copy; sha256 `2ac596bb…37149` at the end) | §3 |
| `node scripts/verify-branch-scope.mjs 700715e WP-0A-DB-00` on `review/a1-batch-171` and on the branch name | exit 0 both: "all 27 changed path(s) are declared, and every amendment explains one" |
| `npm run check:handoff` on the branch name | exit 0: "describes the branch: nothing substantive after its cited head" |
| `npm run verify` on the branch name | exit 0: "tests 685, pass 685, fail 0, skipped 0, todo 0" |
| `gh pr view 181` | OPEN, Draft, head `d3ffe6a`, not merged, `bootstrap` IN_PROGRESS |

**Not measured (read only):** CI's 56 per-family negative-control entries (A0 replayed them; I did not); the
EXPLAIN harness and the 0.066 ms sample; try-it's step 7 beyond `npm run verify` passing `demoPlanProblems`;
171 applied by a non-superuser migration owner (`[198]` (2)); the provisioned instance.

## 2. The questions asked

### 2.1 Does every family refuse members of a workspace in each of the six blocked states?

**Yes, measured, for every relation a client role can read, not only the families the cases list.** My sweep
enumerates every relation in every non-system schema on which `authenticated` holds table or any column SELECT
(41: 39 workspace-scoped tables, `workspace_member_scopes`, `user_profiles`; no view or matview exists in a
non-system schema, and `anon` can select nothing). It moves workspace A to each of the eight states as the
connection role and counts, as each of A's seven members (owner, admin, approver, two editors, viewer, and the
suspended viewer), what each relation returns, all in one rolled-back transaction:

- `active` and `closing`: identical counts for every member and relation (Q-027-2 holds for reads).
- each of `access_blocked`, `purge_queued`, `held`, `purging`, `verify`, `deleted`: every relation returns 0 for
  every member except `app.user_profiles` (1, the caller's own profile, not workspace-scoped) and
  `app.workspace_members` (1 for each active member; the probe in §2.3 shows that row is the caller's own).
  The counts do not differ between the six blocked states.
- **billing:** `app.billing_subscriptions` (the only client-readable billing table) 1 row for the owner in
  active, 0 in every blocked state (Q-027-3). **audit:** `app.audit_logs` and `app.security_events` grant a
  client role nothing at all, so there is nothing to refuse and the sweep confirms no read. **approvals:**
  `approval_policies`, `approval_requests`, `approval_events` 3-5, 3-5, 1-2 rows in active, 0 in every blocked
  state.

Since the sweep reads the catalog rather than a written list, it does not share the cases' stated limit
(`[198]` (5)): a family added later is swept by it. The repository's own 42 cases cover the same ground per
the written list and fail 30-strong with 171 reverted (§1).

### 2.2 Writes

As every active member of A, for every table where `authenticated` holds a column UPDATE (`update t set c = c`)
or DELETE, each statement in an always-rolled-back subtransaction: in `active` and `closing` the owner updates
rows of 16 workspace-scoped tables (`app.workspaces` among them) and the editors their notification; in `access_blocked` and `deleted` the only row any member
updates is its own `user_profiles` row. No client role holds DELETE on any table. INSERT was not swept
generically (it needs values per table); statically, all 24 permissive INSERT policies for `authenticated` call
a helper (census on r2), and the case `owner-a-cannot-create-a-business-in-workspace-a-in-access-blocked`
measures one refusal (42501 by policy).

### 2.3 The own-membership row, the oracle, and app_authz's new read

| probe (r2, each in the eight states) | result |
|---|---|
| owner of A: rows of `app.workspace_members` it sees | active/closing: self + 6 others; every blocked state: **self only** (Q-027-1 kept) |
| owner of A: `workspace_member_role(A)` | `owner` in active/closing, `null` in the six |
| owner of A: rows of `app.workspaces` | 1 in active/closing, 0 in the six |
| owner of B: `workspace_member_role(A)`, `is_active_member(A)`, `workspace_member_role(random uuid)` | `null`, `false`, `null` in all eight states: no oracle about A's existence or state |
| owner of B: `workspace_member_role(B)` while A moves | `owner` throughout |
| as `app_authz` with owner A's claims: `app.workspaces` rows | 1 in active/closing, 0 in the six: no wider than `workspaces_select_active_member` |
| as `app_authz`: `app.workspace_members` rows | 1 (own active row) throughout: unchanged by 171 |
| as `app_authz`: `select name from app.workspaces` | 42501 "permission denied for table workspaces": two columns only |

**Recursion:** none observed. `workspaces_select_authz_own_open` (171:78) reads `app.workspace_members` as
`app_authz`, whose only policy there is 011's inline-JWT predicate with no function call; no 42P17 or
stack-depth error in any of the 8 states × 7 members × 41 relations, the 1129 cases or proof (b). The apply-time
block (2) and the authz lint hold that the app_authz policies call no helper.

**Can app_authz's read widen access?** No, measured: `app_authz` has no login, its only member is `postgres`
(`set_option` true, `inherit_option` false); its privileges are exactly the six columns (block (3), drift d4);
it owns exactly the three helpers. The only SECURITY DEFINER functions any client can execute are
`app.is_active_member(uuid)` and `app.workspace_member_role(uuid)` (catalog census, r2).

### 2.4 Can a client set lifecycle_state, or reach a blocked workspace another way?

- **Set it:** no. `authenticated` holds UPDATE on `app.workspaces` (name, updated_by) only and no INSERT; `anon`
  nothing. A grant through PUBLIC appended at 140 (drift d7b) is refused by 170's block. Unchanged by 171.
- **Definer function:** none reachable but the two helpers, which are the gate. A new client-executable
  SECURITY DEFINER reader (drift d6) is refused by the security-definer probe.
- **View:** none exists in a non-system schema.
- **Another family's join:** the only client-executable non-definer functions in `app` are the five
  `member_scope_*` and `knowledge_scope_applies` helpers (SECURITY INVOKER, so read under the caller's RLS); every
  workspace-scoped client policy but the three kept 010 ones calls a helper (census). A policy joining a family
  table runs under that table's RLS, which is gated. The sweep's zero counts across all 41 relations are the
  measured answer.

### 2.5 Anything newly opened?

**Nothing newly opened that I could measure.** The one widening is the intended one, `app_authz` → `app.workspaces
(id, lifecycle_state)` under a policy no wider than 010's; it is held by the apply-time block, the authz lint, the
pinned grant and the permissive-policy pin. The residual risk is in what the new apply-time block (6) does not
see (F2), held today by older pins.

## 3. Drifts (appended to `db/foundation/migrations/140_audit.sql`, fresh cluster each, restored byte for byte)

| drift | migrate-clean | refused by |
|---|---|---|
| d1 client SELECT policy on `workspace_settings` joining `workspace_members` directly, TO authenticated | exit 2 | 171 (6): "...reads membership without the helper ... workspace_settings.a1_probe_ungated" |
| d2 ninth lifecycle state `archived` | exit 2 | 171 (5): "the lifecycle states ... are not exactly the classified ones" |
| d3 third `app_authz` policy (`using (true)`) | exit 2 | 171 (1): "app_authz holds 3 policies ... exactly two" |
| d4 `grant select (name) on app.workspaces to app_authz` | exit 2 | 171 (3): "...not exactly the six columns ... app.workspaces.name" |
| d5 d1's policy written **TO PUBLIC** | exit 2 | **not 171's block**: the permissive policy probe ("unlisted or changed: app.workspace_settings.a1_probe_public") and the policy set probe (F2) |
| d6 client-executable SECURITY DEFINER reader of business names, no helper | exit 2 | security definer probe ("not a pinned SECURITY DEFINER function") |
| d7 `grant update (lifecycle_state) on app.workspaces to authenticated` | exit 0 | **inconclusive as a drift**: 170 runs after 140 and revokes exactly that grant (catalog confirmed no UPDATE on `lifecycle_state` afterwards); appending at 140 cannot model a later batch here |
| d7b the same grant **to PUBLIC** | exit 2 | 170's block: "a client role can write app.workspaces.lifecycle_state: anon UPDATE, authenticated UPDATE, public UPDATE" |

## 4. Findings

No finding is stop-the-line. None is a tenant leak, secret exposure or migration divergence.

**F1 — Low (governance / claim).** RFC-2026-027's Status line
(`architecture/decisions/RFC-2026-027-lifecycle-visibility.md:3`), RFC-2026-026's
(`architecture/decisions/RFC-2026-026-audit-row-producer.md:3`) and the disposition's D1
(`evidence/WP-0A-DB-00/product-owner-disposition-2026-10-03-batch-171.md:68`) state that "A1's review is the role
runs of batches rfc-026-027, rfc-text, rfc-026-static-rule and 171". The 171 run is this file; it was written
after those lines, it records findings, and it is a same-family subagent run (§0). Citing it in advance as part
of the review the approval stands on reads as an acceptance this run does not give. The lines do record A1's
named-role acceptance as owed (`[195]` (a)), which is correct. *Remedy:* when the Author next touches these
lines, cite this file by name as a findings record and keep the acceptance owed; the Integration Owner and
Product Owner decide whether the delegation reading of the Owner's words (disposition §1) suffices for the
approval itself. This role does not decide that.

**F2 — Low (defence in depth).** 171's apply-time block (6)
(`db/foundation/migrations/171_workspace_lifecycle_visibility.sql:297-320`) scopes itself to policies whose
`polroles` names `authenticated` (`:309`) on tables with a `workspace_id` column, and accepts any textual helper
call (`:316`). Measured (d5): a policy TO PUBLIC that reads membership without the helper passes block (6) and
is refused only by the permissive-policy pin and the policy-set probe. By reading, the same holds for a
workspace-scoped table keyed through another foreign key (no `workspace_id` column), and for a policy whose
helper call does not bind (for example `... or true`). Today nothing escapes, because every policy is pinned by
text; the RFC §6/6 rule as written in 171 is narrower than its comment's claim that "no family escapes the
helper". *Remedy (later batch, not 171 — the migration is not to be rewritten once integrated, and the pins
hold the case now):* widen (6) to `polroles` containing 0 (PUBLIC) or any client role, and record the
remaining reliance on the pins in `[198]`.

**F3 — Low (accuracy, fixable before integration).** 171's header
(`db/foundation/migrations/171_workspace_lifecycle_visibility.sql:60`) lists
`db/foundation/lint/policy-set.json` among the files "PINNED IN THE SAME DIFF". It is not in the diff, and need
not be: the new `app_authz` policy is on a client-writable table and is pinned in `PERMISSIVE_POLICIES`
(`scripts/db/run.mjs`), which the plan's "permissive list 74 → 75" states correctly. *Remedy:* drop
`policy-set.json` from that sentence before 171 is integrated; after integration the migration is immutable.

**F4 — Low (claim scope).** `open_blockers[53]` and `[95]` (`work-packages/WP-0A-DB-00.json:308`, `:350`) are
marked "CLOSED 2026-10-05 BY BATCH 171" on the Author's branch, before review, integration or any application to
the provisioned instance; `catalog-snapshot.json` declares 171 (and 011, which it needs) not applied there, and
`[95]`'s own earlier text said it stays open "until it lands". The measured statements in the closures are true
of the migration set; the gap remains open on the instance. *Remedy:* qualify the closures ("closed in the
migration set when 171 is integrated; the instance holds the gap until 011 and 171 are applied") or point to the
instance item in `[198]`.

**F5 — Informational (source of truth).** RFC-2026-020's text still gives `app_authz` one policy and four
columns; RFC-2026-027 amends it by reference only, because the file is outside `writable_paths`. The resolution
order in `CONTRIBUTING_AGENTS.md` (a newer approved RFC first) resolves the conflict, and the edit is owed in
`[195]` (b). Recorded so a reader of RFC-2026-020 alone is not misled.

**F6 — Informational (limit carried).** Every measurement here, mine and A0's, applies migrations as the
superuser `postgres`; `alter function ... owner to app_authz`, the column grant and the policy on
`app.workspaces` are not measured under a non-superuser migration owner (`[198]` (2)). 011 carries the same
precondition, so 171 adds no new one by reading.

## 5. Claims checked

| claim | verdict |
|---|---|
| 1087 → 1129 cases, 6 → 7 proofs, green on fresh clusters | TRUE (three rounds) |
| 30 of the 42 new cases fail with 171 reverted in place | TRUE (30 of 1129 fail; 2 proofs fail) |
| §6/6 census 91 / 89 in scope / 3 without helper | TRUE |
| A0's four drifts refused by 171's block with the quoted messages | TRUE (d1-d4) |
| 52 apply-time blocks, 38 as written, 14 superseded and replaced | TRUE |
| `700715e..d6fbf5f`: 5 added, 21 modified, 0 deleted; `d3ffe6a` touches the handoff alone | TRUE |
| suite 685, `npm run verify` exit 0 on the branch name; `check:handoff` exit 0; scope exit 0 | TRUE |
| the Owner's 2026-10-05 words as transcribed | consistent with main's earlier transcription; not checked against the conversation |
| 171's header: `policy-set.json` pinned in the same diff | FALSE (F3) |
| `[53]`, `[95]` closed | true of the migration set, premature for the instance and before integration (F4) |
| RFC Status lines: "A1's review is the role runs of ... 171" | written before this run; this run accepts nothing (F1) |
| CI's 56 negative-control entries, 56 ok; EXPLAIN 0.066 ms | not re-measured |

## 6. Stop-the-line and merge

**Stop-the-line: no.** Nothing measured leaks a tenant's data, exposes a secret, duplicates a side effect, loses
a job, diverges a migration or deletes irreversibly; 171 closes a measured read-and-write gap.

**Does anything block the merge?** Not from this review's findings: F1-F4 are Low and F2 is held by existing pins.
What blocks a merge today is outside them: the required check `bootstrap` on `d3ffe6a` was IN_PROGRESS when read,
and C0's and Q0's role runs, the Integration Owner's evidence (`[188]`) and the named-role acceptances
(`[194]`, `[195]` (a)) are owed. F3 is the one item best fixed before integration, because the migration's text
freezes then.

## 7. Limits

- Same vendor and model family as the Author (§0); this is not the independent human A1 acceptance the
  repository asks for.
- One discarded round: my first migrate-clean / rls-smoke round and my first runs of drifts d1 and d5 ran under
  Node 26.7.0 (a PATH ordering slip in my own wrapper). They are not cited; every result above was re-run under
  Node 24.20.0 on a fresh cluster.
- All measurement is on throwaway local clusters as superuser, never on the provisioned instance.
- The sweeps cover reads and UPDATE/DELETE generically; INSERT is covered statically and by the repository's
  cases, not by my own generic sweep.
- Drift d7 could not model a later client grant on `lifecycle_state`, because drifts are appended at 140 and
  170 revokes after it.
- Cleanup: the cluster on 5501 was stopped and its data directory removed; `140_audit.sql` was restored byte for
  byte after every drift (sha256 unchanged at the end); nothing outside this worktree and the private directory
  `a1-171/` was written; nothing was pushed.
