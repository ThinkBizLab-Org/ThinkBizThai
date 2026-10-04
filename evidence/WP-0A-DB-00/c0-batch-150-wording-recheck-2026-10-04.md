# C0 contract review re-check: batch 150's wording fix

| Field | Value |
|---|---|
| Run | `/claude/c0_contract_reviewer` |
| Role | Independent Reviewer (contract), work package `WP-0A-DB-00` |
| Subject branch | `agent/claude/WP-0A-DB-00-batch-150` (PR #173, Draft) |
| Subject head | `5c406de235adc9bd5312a83b9ae77becac46d9e4` (handoff refresh, alone), over `7e6c797ccee85757e432872b3930e6f24f046182` (the wording fix and its records) |
| Previous reviewed head | `218f91f` (my re-check: `c0-batch-150-recheck-2026-10-03.md`, cherry-picked as `c2cac16`) |
| Base | `1930f41` (`main`) |
| Author | `/claude/a0_atlas` |
| Date | 2026-10-04 |
| Reviewed in | local branch `recheck/c0-batch-150-wording`, created at `5c406de` in a worktree. The guards that read the branch name were run with the subject branch NAME checked out (§2). |
| Scope | NARROW: `git diff 218f91f..5c406de -- db/ handoffs/ evidence/WP-0A-DB-00/a0-batch-150-plan-2026-10-03.md work-packages/`, against my finding C0-R1 and the same finding by A1 (F150r-1) and Q0 (Q2-1). |

This document records review findings. It advances no status, approves nothing, and signs nothing on
anyone's behalf.

## §0 What I am, before anything else

- I am a subagent **spawned by the Author run `/claude/a0_atlas`**, in a git worktree A0's workflow
  created, under a brief A0's workflow wrote. A0 chose the questions and the narrow scope.
- I am the **same vendor and model family** as the Author (Claude). RFC-2026-024 withdrew the
  cross-vendor condition, so that is not by itself a bar; it is still a real limit on independence.
- Whether this file counts as the Reviewer signature that RFC-2026-002 requires is for the **Integration
  Owner and the Product Owner** to decide. I do not decide it.

## §1 Verdict in one paragraph

The corrected sentence is **true as measured** on a fresh cluster: over all 23 roles (15 predefined), only
`postgres` (superuser and owner) and the predefined `pg_write_all_data` hold INSERT or UPDATE on
`app.performance_snapshots.id`; none of the six named application roles does, and neither does the shim's
`service_role`. The catalog comment as stored reads the corrected text. The edit changed **no executable
statement** of 150: with `--` comments removed and the two `COMMENT ON` literals masked, the old and new
files are identical (sha256 prefix `9059feeafa2c1e27` both); the only non-comment difference is inside
the key comment's string literal. migrate-clean and rls-smoke (twice) exit 0; scope, check:handoff and
verify exit 0 on the branch name (684/684). The only blocker edit is a pure append to `[194]`. I found
**nothing stop-the-line and nothing that blocks the merge**. Three INFO findings, none needing a change
before merge.

## §2 Measured vs read

Setup: Node `v24.20.0` (`/Users/bank/.local/node-v24.20.0/bin`, printed before each run); PostgreSQL
17.11 from `/opt/homebrew/bin`; one fresh `initdb --locale=C -A trust -U postgres`; 127.0.0.1:5505 only,
TCP only (`-c unix_socket_directories=''`); `LC_ALL=C`; the shim `db/foundation/ci/supabase-shim.sql`
first; `DB_TEST_URL=postgresql://postgres@127.0.0.1:5505/postgres`; private directory `scratchpad/c0-150w/`.
No repository file was modified for any measurement.

### Measured

| What | Command | Exit | Output |
|---|---|---|---|
| shim | `psql -v ON_ERROR_STOP=1 -f db/foundation/ci/supabase-shim.sql` | 0 | -- |
| migrate-clean | `make db-migrate-clean` | 0 | "applied 150_performance_snapshots_key.sql"; pinned shape 3 tables / 32 constraints / 18 indexes / 4 policies / 0 triggers; post-migrate "50 apply-time blocks, 38 re-run as written, 12 superseded and replaced" |
| rls-smoke | `make db-rls-smoke`, twice | 0 / 0 | "6 claim(s) discharged by execution"; "db-rls-smoke: ok" both times |
| id writers, every role | `has_column_privilege(r.oid, 'app.performance_snapshots', 'id', 'INSERT'/'UPDATE')` over all of `pg_roles` (23 roles, 15 `pg_*`) | 0 | true for exactly **`pg_write_all_data`** (not super, not bypassrls) and **`postgres`** (super, bypassrls, the table's owner) |
| named application roles | the same for `app_worker`, `app_command`, `app_maintenance`, `app_authz`, `anon`, `authenticated` | 0 | false / false for all six |
| other roles | non-`pg_*` roles on the cluster | 0 | the six above, `postgres`, and `service_role` (shim; not super, not bypassrls); `service_role` holds neither |
| superusers / memberships | `pg_roles where rolsuper`; `pg_auth_members` for `pg_write_all_data` and the owner | 0 | `postgres` only; **0 members** of `pg_write_all_data` |
| stored comment | `obj_description(oid, 'pg_constraint')` on `performance_snapshots_pkey` | 0 | "...no application role holds INSERT or UPDATE on id keep it unique (superusers, the owner and pg_write_all_data excepted; measured on the CI shim)..." |
| key, identity | `pg_get_constraintdef`; `attidentity` | 0 | `PRIMARY KEY (id, metric_time)`; `a` |
| W1 | temp role `nologin`, granted `pg_write_all_data`, `insert ... overriding system value` with an existing `id` at `metric_time + 1s`; rolled back | **ERROR** | `new row violates row-level security policy for table "performance_snapshots"` (forced RLS; no policy names it) |
| W2 | the same with a temp role `bypassrls` + `pg_write_all_data`; rolled back | 0 | accepted; that `id` on 2 rows |
| W3 | the same as `postgres`; rolled back | 0 | accepted; that `id` on 2 rows |
| W4 | the same as `service_role`, then as `app_worker`; rolled back | **ERROR** | `permission denied for schema app`; `permission denied for table performance_snapshots` |
| after | row count, leftover temp roles | 0 | 4 rows (as before); 0 temp roles |
| executable diff | comment-stripping scanner over `218f91f:150` and the head's 150; `COMMENT ON` literals masked | -- | 84 vs 85 non-comment lines; the only difference is the key comment's literal (1 line becomes 2); masked texts identical |
| repo diff | `git diff --stat 218f91f 5c406de` | 0 | 8 files: README (5), 150 (11), plan (+51), three cherry-picked re-check files, handoff (7), WP (2). `5c406de` touches only the handoff |
| stale wording | `grep -rn "no role but the"` | -- | only in evidence files that quote the finding (C0, A1, Q0 re-checks and reviews, plan §12 line 472); none in `db/`, the handoff or the WP |
| blockers | node: `open_blockers` at `218f91f` vs head | -- | 195 = 195; only `[194]` changes, a **pure append** (+648 chars); no other top-level WP key changes |
| cherry-picks | commit bodies of `c2cac16`, `5c780ea`, `9d1b562` | -- | each carries `(cherry picked from commit 1e6cf9d…)`, `(… dc0b695…)`, `(… cabd62f…)` as plan §12's table says |

### Guards on the branch name

The subject branch is checked out in other worktrees, so I used `git checkout --ignore-other-worktrees
agent/claude/WP-0A-DB-00-batch-150` at `5c406de`, made no change and no commit on it, then switched back to
`recheck/c0-batch-150-wording` before writing this file.

| What | Command | Exit | Output |
|---|---|---|---|
| scope | `node scripts/verify-branch-scope.mjs 1930f41 WP-0A-DB-00` | 0 | "all 22 changed path(s) are declared, and every amendment explains one" |
| handoff | `npm run check:handoff` | 0 | "describes the branch: nothing substantive after its cited head" |
| suite | `npm run verify` | 0 | "clean: exit 0 — tests 684, pass 684, fail 0, skipped 0, todo 0" |

### Read, not measured

- CI being green on `218f91f` (run 37171840296), as plan §12 says. I did not query CI.
- That A1's and Q0's re-check files are byte-identical to their originals: I read the cherry-pick trailers,
  not the original commits' trees.
- The provisioned instance: nothing here measures it (Q170-c).

## §3 Answers to the four questions

**(1) Is the corrected sentence true?** Yes, in all four places (150:29-34 header, 150:86-88 catalog
comment, README:642-644, handoff `security_privacy_cost_impact`). On the shim, the only holders of
INSERT/UPDATE on `id` are the superuser-owner and `pg_write_all_data`; every application role is refused.
The sentence's scope ("measured on the CI shim"; the instance is Q170-c's) is stated, which is the honest
limit. See C0-W1 for a nuance that makes the header slightly *broader* than the measured behaviour, which
is the safe direction.

**(2) Did the edit change anything but comment or prose in 150?** No executable statement changed. The
catalog comment's literal changed, which is the point of the fix; 150 is not integrated, so editing it in
place is legitimate, and no static assertion or pinned shape reads that literal (verify 684/684, pinned
shape unchanged).

**(3) migrate-clean, rls-smoke, check:handoff, verify.** All exit 0 (§2), the last two on the branch name.

**(4) Is plan §12 / the `[194]` addition accurate?** Yes on every point I could measure: the cherry-pick
table, the migrate-clean block counts (50 / 38 / 12), rls-smoke twice, the stored comment, and the four
places corrected. Two small gaps, C0-W2 and C0-W3.

## §4 Findings

### C0-W1 (INFO, measured): `pg_write_all_data` holds the privilege, but on this table it cannot use it without BYPASSRLS

150's header says superusers, the owner and `pg_write_all_data` "can still insert a second row with an
existing id". A member of `pg_write_all_data` without BYPASSRLS is refused by forced RLS (W1); one with
BYPASSRLS succeeds (W2). The privilege statement ("holds INSERT or UPDATE") is exactly true; the "can
still insert" clause over-includes, which overstates the risk rather than understating it. The catalog
comment and README say only "excepted", which is exact. No change needed; if 150 is touched again, "a
`pg_write_all_data` member with BYPASSRLS" would be exact. The shim's `service_role` is not BYPASSRLS; on
a real Supabase instance it is, so the instance reading (Q170-c) should include `service_role`'s
membership and privileges.

### C0-W2 (INFO, read): `[194]`'s addition omits C0-R2, which plan §12 says is on `[194]`

Plan §12 lists four items "recorded here and on open_blockers[194]"; the `[194]` append carries three
(exclusion constraints, the partition parent's RLS, 16 vs 17). The stale "139 lines" in plan §1 (C0-R2,
INFO; the file is 180 lines) is in §12 only. Harmless: C0-R2 is INFO and the plan holds it. Either the
sentence in §12 or `[194]` could be aligned at the next append.

### C0-W3 (INFO, read): "The integrity manifest is regenerated" produced no change

Plan §12 (line 496) says the manifest is regenerated, but `test-kits/integrity-manifest.json` is not in
`218f91f..5c406de`; no file it digests changed (it does not list 150, the README, the WP or the handoff).
The sentence is not false, but a reader may expect a diff. Verify passes, so the manifest is consistent.

The six named application roles in the header omit `service_role`; it holds nothing on `id` on the shim,
so "no application role" stays true. Noted, not a finding.

## §5 Stop-the-line verdict

**No stop-the-line.** No secret exposure, tenant leakage, migration divergence or contract mismatch: the
change is a comment literal and prose, and every measured privilege matches the corrected text.
**Nothing found here blocks the merge.** Merging is the Integration Owner's and the Product Owner's to
decide under RFC-2026-002.

## §6 Limits

- One PostgreSQL version (17.11), on the CI shim only; the shim's roles are not the platform's (e.g.
  `service_role` is not BYPASSRLS here). The provisioned instance is Q170-c's to measure.
- `pg_write_all_data` membership was read on the fixture cluster only (0 members).
- I re-ran no mutant and no drift; the probes' self-tests ran inside migrate-clean as usual.
- Narrow scope: the wording diff only. My earlier review and re-check cover the rest of batch 150.
- Everything in §0 applies.

## §7 Cleanup

- One cluster under `scratchpad/c0-150w/pgdata`, stopped (`pg_ctl -m fast stop`) and removed at the end;
  `lsof -iTCP:5505 -sTCP:LISTEN` then returned nothing. No other port was touched.
- Every write probe ran in a transaction that was rolled back; the table held 4 rows before and after, and
  no temp role remained.
- The subject branch was checked out by name only to run the three guards and was left as found. This file
  is the only change, committed on `recheck/c0-batch-150-wording` and not pushed.
