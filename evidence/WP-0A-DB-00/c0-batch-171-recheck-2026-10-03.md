# C0 contract review re-check: batch 171's review round

- **Package:** `WP-0A-DB-00`. **Role:** independent Reviewer, run `/claude/c0_contract_reviewer`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-171`, head
  `cf9d1de748879b7ce2375d7fd5c80f8a5a537ac1` over code `155412ad8e2364d4468415977381a79833c5bca9`, base
  `700715e` (main). Author `/claude/a0_atlas`. Previous reviewed head `d3ffe6a` (my record:
  `c0-batch-171-contract-review-2026-10-03.md`, cherry-picked here as `52296f6`). Draft PR
  <https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/181>.
- **Re-check branch:** `recheck/c0-batch-171`, created at the subject head `cf9d1de`. This file is its only
  commit.
- **Status:** this file records findings. It advances no status, approves nothing, and fixes nothing.
- **Scope:** NARROW. My own findings of the first round (M1, M2, L1-L6, N1-N5) against the review-round
  commits `52296f6`, `4c31d11`, `93a0960`, `155412a`, `cf9d1de`; anything new those commits introduce.
- **Inputs read:** `CONTRIBUTING_AGENTS.md`; my first-round record; the plan
  `a0-batch-171-plan-2026-10-03.md` (whole diff `d3ffe6a..155412a`, and §8 in full); the disposition
  `product-owner-disposition-2026-10-03-batch-171.md` (diff); `product-owner-disposition-2026-10-03-batch-rfc-026-static-rule.md`
  lines 17-21 and 42-46; `git diff d3ffe6a..155412a` for `db/`, `scripts/`, `tests/`, `architecture/`,
  `work-packages/`; both new commit messages; RFC-2026-027's head (lines 1-12) and §6 (362-380); the Status
  line of RFC-2026-026; `open_blockers[53, 95, 194, 195, 198]` against base `700715e`; the handoff;
  `db/foundation/README.md:826-829`; `scripts/db/explain-harness.mjs:25-30`; `171`'s header (1-12, 27-63).

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author's run, of the same vendor and model family. Under
RFC-2026-024 that makes this an independent-role run by configuration, not by provenance: I share the
Author's training and blind spots. Acceptance of this file as the C0 role's signature is the Integration
Owner's and the Product Owner's act, not mine.

## 1. Verdict

- **Stop-the-line: no.** The review round only narrows client reach further (171's §6/6 block is stricter) and
  edits text. Every live layer is green on two fresh clusters (§2). Nothing reaches a secret, a tenant
  boundary in the widening direction, an applied migration, an irreversible deletion or a contract-catalog file.
- **Blocks the merge: no, on my findings.** All of my first-round findings are resolved or recorded by name
  (§3). Three LOW and three NOTE findings are new (§4); none blocks.
  - One fact the merge decision must weigh, and which is not mine to decide: the two RFC approvals and the SLO
    ratification now rest, by the batch's own honest record, on **A0's reading** of the Owner's words, with
    the Owner's confirmation owed (`open_blockers[195]` (e)). Merging 171 puts RFC-2026-027 in effect on that
    reading (R1).
- **CI:** at the time of writing, `bootstrap` on `cf9d1de` (run 37244108784) was `IN_PROGRESS`. I did not see
  it finish.

### Answers to the questions

1. **Is migration 171 exactly RFC-2026-027 as written?** **Yes for §3.1-§3.3 and §4, which the round did not
   touch** (the code diff in `171` is the header and block (6) only, measured by `git diff d3ffe6a..155412a`).
   - The single `app_authz` policy per §3.1, the helper per §3.2, the five 010 rewrites per §3.3 and the
     state sets (admitted `active`, `closing`; six blocked) are unchanged from what I measured in the first
     round; this round's smoke re-ran them green (P4-equivalent pins in `run.mjs` hold).
   - **Block (6) now enforces a superset of §6/6's text.** RFC §6/6 (:375) says "every permissive policy
     `TO authenticated`"; 171 now also covers TO anon and TO PUBLIC and exempts by `(table, name)`. This is
     stricter, catches no shipped policy (census below), and is recorded in plan §8.2 and `[198]` (6). The
     RFC's text was not updated (R4, NOTE).
   - **§5/3's UPDATE** remains no-effect rather than 42501; now recorded as a deviation in plan §4.1 row 3,
     §5 and `[198]` (8). The RFC text is owed at its next revision. Accepted as recorded.
   - **The RFC-020 amendment (§3.4)** still applies by reference; the edit is still owed (`[195]` (b)). The
     only stale "single policy" left in code is a quotation of RFC-2026-020 (`authz-proofs.mjs:246`), which
     is consistent with N1 (R6, NOTE).
2. **Are the approvals and the SLO ratification recorded honestly, as the Owner's decisions taken through
   delegation, with the named-role acceptances owed?** **Yes, now, in the primary records**; with one gap
   in the secondary ones (R2).
   - Disposition §1 (:23-35) now says the reach of the words is A0's reading, that no prior A0 message naming
     the three items is in the repository, and that the earlier summary recommended nothing on the SLO. I read
     the static-rule disposition's lines 19-21 and 44: they say exactly that. §3 and §5 repeat it; both RFC
     Status lines carry it; `[195]` (e) holds the owed confirmation by name, including the SLO.
   - Batch 171's own A1 run is no longer counted as review (both Status lines, D1, `[195]`).
   - A1 Security is now named for the number 171 (D4, `[195]` (a)); RFC-027's Author line corrected.
   - **Gap (R2):** `db/foundation/README.md:826-829`, `scripts/db/explain-harness.mjs:27-29`,
     `171_workspace_lifecycle_visibility.sql:4-7` and `open_blockers[194]` (from offset 14081, "Q150-d
     RATIFIED") still state the approval/ratification flatly, without the "A0's reading; confirmation owed"
     qualifier. Each cites the disposition, which carries it, so nothing is false; but a reader of the
     README alone is told the SLO is ratified, and the SLO is the item the earlier record (static-rule
     disposition :44) says the Owner's words of that day decided nothing on.
3. **Are ownership and supersession legitimate?** **Yes.**
   - `verify-branch-scope`: all 30 paths declared (27 + the three cherry-picked role records), measured.
   - `open_blockers` edits are append-only against `700715e`: `[53]`, `[95]`, `[194]`, `[195]` are prefix
     extensions of their base text, `[198]` is new and last (198 → 199), and the only other changed key is
     `ownership` (the rationale text). Measured by a script comparing base and head JSON.
   - The three cherry-picks are byte-faithful: `git diff <original> cf9d1de -- <record>` is empty for each of
     `b450465`, `ff844b4`, `4271532`; each carries its `(cherry picked from commit …)` trailer; each original's
     parent is `d3ffe6a`.
   - 171 is edited in place while not integrated (migration invariant 1 forbids that only after integration);
     declared not applied to the instance.
4. **Are the claims in the commit messages, plan, disposition, blocker edits and handoff true?** **True where
   I measured or read them**, with R3 (an unrecorded limit) and R5 (a `Revised:` line that under-describes).
   Detail in §2 and §3.

## 2. Measured, and how

**Node and branch.** Node `v24.20.0` (`node -v` before every measured run; `/Users/bank/.local/node-v24.20.0/bin`
first on PATH; the Homebrew Node 26 not used). The three repository commands were measured **on the branch
NAME**: `git checkout --ignore-other-worktrees agent/claude/WP-0A-DB-00-batch-171` (the ref was `cf9d1de`,
equal to `origin/…`), then measured, then back to `recheck/c0-batch-171`. Afterwards the branch ref was still
`cf9d1de` and `git status` was empty.

| command | exit | result |
|---|---|---|
| `node scripts/verify-branch-scope.mjs 700715e WP-0A-DB-00` | 0 | `all 30 changed path(s) are declared, and every amendment explains one` |
| `npm run check:handoff` | 0 | `describes the branch: nothing substantive after its cited head` |
| `npm run verify` | 0 | `clean: exit 0 — tests 685, pass 685, fail 0, skipped 0, todo 0` |
| live round r1, port 5505 | 0, 0 | migrate-clean: 52 apply-time blocks, 38 as written, 14 superseded and replaced; rls-smoke: `1129 isolation case(s) passed`, `db-authz-proofs: ok — 7 claim(s)` |
| live round r2, a fresh cluster | 0, 0 | the same |
| r1's proof log | n/a | gate 0, case 8 4 (= baseline), case 11 0 in **each** of `access_blocked`, `purge_queued`, `held`, `purging`, `verify`, `deleted`; the §6.1 claim prints **both** pinned expressions |
| drifts d1, d2, d4, d5 (below) | 2, 2, 2, 2 | d1, d2 now refused by **171 (6)**; d4, d5 pass 171 (6) and are refused by other probes |
| `140_audit.sql` after every drift and at the end | n/a | `cmp` identical to the saved original, sha256 `2ac596bb…c1ad37149` |
| probe P6 on r1's cluster (below) | n/a | the empty-in-active families per identity equal `LIFECYCLE_EMPTY_IN_ACTIVE` exactly |
| census C1 on r2's cluster (below) | n/a | 0 TO PUBLIC, 0 TO anon, 91 client permissive, 89 in scope, 3 without helper = the three exempt pairs |
| cherry-pick fidelity, blocker prefix check, handoff file counts | n/a | §1 Q3; handoff 8 added + 22 modified = `git diff --name-status 700715e 155412a` (8 A, 22 M) |
| `gh pr view 181` (read-only) | n/a | OPEN, Draft, head `cf9d1de`, MERGEABLE; body has "## Review round (plan §8)"; check `bootstrap` IN_PROGRESS |

**The cluster.** Private directory `scratchpad/c0-171r2/`. `initdb --locale=C -A trust -U postgres`, `LC_ALL=C`,
TCP only on `127.0.0.1:5505` (`-c unix_socket_directories=''`), `db/foundation/ci/supabase-shim.sql` first, then
`DB_TEST_URL=postgresql://postgres@127.0.0.1:5505/postgres make db-migrate-clean` and `make db-rls-smoke`.
Re-initdb for every round and every drift. At the end the cluster was stopped, its data directory removed, and
`pg_isready -h 127.0.0.1 -p 5505` answers `no response`.

**Drifts**, each appended to `140_audit.sql` (which applies before 171) on a fresh cluster:

| drift | migrate-clean | refused by |
|---|---|---|
| d1 (my first-round d1, unchanged): permissive SELECT, **no `TO` clause**, on `workspace_settings`, joining membership directly | 2 | **171 (6)**: `… the lifecycle gate does not reach it: workspace_settings.c0_probe_public` (first round: passed 171) |
| d2 (my first-round d2, unchanged): **named `workspaces_update_owner`** on `workspace_settings`, TO authenticated | 2 | **171 (6)**: `… workspace_settings.workspaces_update_owner` (first round: passed 171) |
| d4 (new): a group role `c0_probe_group`, `grant c0_probe_group to authenticated`, and the ungated policy **TO c0_probe_group** | 2 | **not** 171 (0 lines from 171 in the log; 171 applied). Refused by the permissive policy probe (`unlisted or changed: app.workspace_settings.c0_probe_group_read`), the client membership probe and the pinned grant probe (`authenticated -> c0_probe_group`) |
| d5 (new): TO authenticated, `using (app.is_active_member(workspace_id) or true)` | 2 | **not** 171 (as `[198]` (6) says). Refused by the permissive policy probe and the policy set probe |

**P6.** On r1's cluster after rls-smoke, as each identity in a rolled-back transaction, workspace A in
`active`, `lifecycleFamilySql(LIFECYCLE_MEMBER_FAMILY, '=')` (the exported builder, 40 families):

| identity | families empty in active | declared in `LIFECYCLE_EMPTY_IN_ACTIVE` |
|---|---|---|
| owner of A | `workspace_member_scopes` | (owner sweep uses the 39-family list) |
| editor of A | `billing_subscriptions, quota_buckets, workspace_invitations, workspace_members` | the same four |
| viewer of A | those four and `notifications` | the same five |

So the editor's and viewer's new per-family before-read (`isolation-cases.mjs:19777-19781`, `'='` with
`expect: 'no-rows'`) is non-vacuous for 36 and 35 families respectively, and would fail at `before` if any of
them emptied.

**C1.** Block (6)'s widened predicate without the exemption, on r2's clean cluster: 89 policies in scope, the
3 calling neither helper are exactly `workspaces.workspaces_select_active_member`, `workspaces.workspaces_update_owner`,
`workspace_members.workspace_members_select_own_active`. The widening catches no shipped policy, as plan §8.2 says.

**Read, not re-measured:** the Author's TO anon drift; the CI negative-control replay; the "171 reverted, 30 of
42 fail" run; the EXPLAIN harness sample; the non-superuser apply (`[198]` (2), not measured by anyone).

## 3. My first-round findings, re-checked

| finding | what changed | verdict |
|---|---|---|
| **M1** delegation's reach rests on an unrecorded recommendation | Disposition §1 (:23-35) re-worded as A0's reading, the missing message stated as missing, the SLO gap stated; §3 (:75-76), §5 (:127-128), both RFC Status lines, `[195]` (e), handoff `decisions_consumed[0]` | **Resolved** by the remedy's second branch. The first branch (transcription) is not available; the Author says so. Residue: R1, R2 |
| **M2** 171's A1 run counted as review before it existed | Both Status lines and D1 drop "and 171" and name the run as a findings record that accepts nothing; `Revised:` line added to each RFC | **Resolved.** Residue: R5 (NOTE) |
| **L1** §6/6 block misses TO PUBLIC; exempts by name | 171:299-326 (role test 315-317, pairs 321-323): `0::oid = any (p.polroles)` or `authenticated`/`anon`; three `(relname, polname)` pairs; comment updated | **Resolved, measured** (d1, d2 now refused by 171 (6)). Residue: R3 |
| **L2** cases 8/11 in one state | `authz-proofs.mjs:584-600` (loop at 587) runs over `LIFECYCLE_BLOCKED` | **Resolved, measured** (six states each). Still `business_profiles` only: recorded `[198]` (7). Accepted |
| **L3** §5/3 UPDATE deviation unrecorded | plan §4.1 row 3, §5, `[198]` (8) | **Resolved** as recorded |
| **L4** editor/viewer sweeps can pass vacuously | per-family before-read; empty families named in `LIFECYCLE_EMPTY_IN_ACTIVE`, the case `why`, `[198]` (5), plan §4.1 | **Resolved, measured** (P6) |
| **L5** two records name unchanged files | 171:60-63 says `policy-set.json` is NOT changed and why; manifest rationale says `retention-map.json` is not changed | **Resolved.** Both files unchanged in `700715e..cf9d1de` (30-path list) |
| **L6** A1 Security not named for 171 | D4 (:83), `[195]` (a), plan §5, RFC-027 Author line (:10) | **Resolved** |
| **N1** RFC-020 text | unchanged; owed `[195]` (b) | Unchanged, as expected (outside `writable_paths`) |
| **N2** stale wording | `run.mjs:2931-2932`; §6.1 proof prints both | **Resolved, measured** (r1 log) |
| **N3** non-superuser apply | owed `[198]` (2) | Unchanged |
| **N4** "130/131" | 171:30 says "130"; 131 has 0 helper calls (measured, `grep -c`) | **Resolved** |
| **N5** own membership row | no change asked | — |

Also from A1 F4 (not mine, read for consistency): `[53]` and `[95]` now say "closed … in the migration set,
when 171 is integrated; on the provisioned instance the gap stays open until 011 and 171 are applied there",
and disposition §4 (:115-117) says the same. True to the record.

## 4. New findings

Grades: MEDIUM = a claim or control the batch relies on is not what it says; LOW = a text fix or an unrecorded
narrowing/limit; NOTE = no remedy required.

### R1 (LOW). The merge puts RFC-2026-027 in effect on a reading the Owner has not confirmed

After M1's remedy the record is honest: D1-D3 are A0's reading of the words, confirmation owed
(`[195]` (e)), and the disposition (:34-35) and `[195]` (e) leave "whether that reading suffices for the
approvals" to the Owner and the Integration Owner. RFC-2026-027's Status line says it is **in effect when 171
is integrated**. So the merge itself is the act that turns the unconfirmed reading into an effective
authorization change. Under the standing PO-directed merge delegation, the Author's run may press that merge.

**Remedy:** obtain the Owner's confirmation of `[195]` (e) before the merge; or, if the Integration Owner merges
without it, the merge disposition says in terms that it merges on A0's reading with (e) open. Not a blocker on
my grading; the decision is the Owner's and the Integration Owner's.

### R2 (LOW). Four secondary records state the approval / SLO ratification without the new qualifier

- `db/foundation/README.md:826-829`: "on 2026-10-05 they were **RATIFIED as the Pilot p95 DB-time budget**, as
  the Owner's decision taken through the delegation…".
- `scripts/db/explain-harness.mjs:27-29`: "RATIFIED 2026-10-05 as the Pilot p95 DB-time budget through the
  Owner's delegation".
- `open_blockers[194]` (the append beginning "Q150-d RATIFIED 2026-10-05").
- `171_workspace_lifecycle_visibility.sql:4-7` (RFC-2026-027 "approved … as the Owner's decision").

None is false (each cites the disposition, which carries the qualifier), but none says the reach is A0's
reading or points to `[195]` (e). The SLO is the weakest of the three: the static-rule disposition (:20-21, :44)
records that the summary answered that day recommended nothing on it and that "the words decide nothing there".

**Remedy:** append "(that the delegation reaches this is A0's reading; the Owner's confirmation is owed,
`open_blockers[195]` (e))" to the README sentence and to `[194]`'s append; the harness comment and 171's header
can follow (171 is still editable before integration).

### R3 (LOW). Block (6) does not follow role inheritance, and `[198]` (6) does not list that

Block (6)'s role test (171:315-317) is `0 = any(polroles)` or a role named `authenticated` or `anon`. A policy
TO a role that `authenticated` is a member of applies to `authenticated` too. Drift d4 (a group role granted to
`authenticated`, the ungated policy TO it) passes 171 (6) and is refused by the permissive policy probe, the
client membership probe and the pinned grant probe. Defence in depth holds, and the membership itself is
refused independently. But `[198]` (6) enumerates what the block "still does not see" and names only the
other-foreign-key table and the non-binding call.

**Remedy:** add "a policy TO a role a client role inherits" to `[198]` (6)'s list (or use
`pg_has_role('authenticated', r.oid, 'USAGE')` in the test). Text only, either way.

### R4 (NOTE). RFC-2026-027 §6/6 still says `TO authenticated`

171's block is now a strict superset of §6/6 (:375). Plan §5 lists §5/3's text as owed at the next revision
but not §6/6's. Add it to the same line.

### R5 (NOTE). The `Revised:` lines describe the Status-line change incompletely

Both RFCs' new `Revised:` lines (RFC-027:9, RFC-026:11) say the Status line "no longer counts batch 171's A1 run",
and "No other sentence of this file changed". The Status line also gained "that the Owner's words reach this
approval is A0's reading … (`open_blockers[195]` (e))". That clause is in the same sentence, so "no other
sentence" is literally true; the description omits it. Text, at the next revision.

### R6 (NOTE). `authz-proofs.mjs:246` still says "app_authz's single policy"

It is in quotation marks and quotes RFC-2026-020's text, which is unchanged (N1). Consistent; it will need the
same edit when `[195]` (b) lands.

## 5. Limits

- I am the Author's vendor and model family (§0), and I wrote no code and fixed nothing.
- **Measured:** §2's table, the four drifts, P6 and C1. **Read:** the items listed at the end of §2, the text
  edits in §3, and the RFC text.
- CI on `cf9d1de` had not finished when this file was written.
- I re-checked only the review round; §3.1-§3.3 and §4 of 171 were not re-diffed against the RFC this round
  because the round's code diff does not touch them (measured by `git diff d3ffe6a..155412a`).
- Nothing was written outside this worktree and `scratchpad/c0-171r2/`. `140_audit.sql` was restored byte for
  byte after every drift. The cluster on 5505 is stopped and its data directory removed.
- This file is the re-check branch's only commit. It is not pushed.
