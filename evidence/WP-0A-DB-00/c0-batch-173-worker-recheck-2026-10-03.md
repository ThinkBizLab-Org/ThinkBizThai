# C0 contract review re-check: batch 173-worker's review round

- **Package:** `WP-0A-DB-00`. **Role:** independent Reviewer, run `/claude/c0_contract_reviewer`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-173-worker`, head
  `f1f006a874ff88311465f1cea75ff83509d9a392` over code `631512bb5b4c1f305ad436f6101a733ec20debab`, base `aa0e89f`
  (main). Author `/claude/a0_atlas`. Draft PR <https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/184>. Previously
  reviewed head: `b001495` (my record: `c0-batch-173-worker-contract-review-2026-10-03.md`, cherry-picked as `796bd67`).
- **Re-check branch:** `recheck/c0-batch-173-worker`, checked out at the subject head `f1f006a`. This file is its only
  commit. It is not pushed.
- **Scope:** NARROW. The review round `b001495..f1f006a` (commits `796bd67`, `869217c`, `b2ed62f` = the three role
  records, cherry-picked; `631512b` = the code; `f1f006a` = the handoff), my own findings C0-1 to C0-6 first, then the
  other runs' findings as they touch the contract.
- **Status:** this file records findings. It advances no status, approves nothing and fixes nothing.
- **Inputs read:** `CONTRIBUTING_AGENTS.md`; my earlier record; the plan (whole §2 row 10/12, §4 D12, the new §7); the
  disposition `product-owner-disposition-2026-10-03-batch-173-worker.md` §4-§5 (unchanged in the round); `git diff
  aa0e89f..f1f006a` with `b001495..f1f006a` read line by line for code, the RFC, the manifest and the handoff; both
  round commit messages; A1's A1-173-1 text and merge verdict; RFC-2026-028's Implemented line (the only changed line).

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author's run, of the same vendor and model family. Under RFC-2026-024 that
makes this an independent-role run by configuration, not by provenance: I share the Author's training and blind spots.
Acceptance of this file as the C0 role's signature is the Integration Owner's and the Product Owner's act, not mine.

## 1. Verdict

- **Stop-the-line: no.** No secret, tenant leak, lost job, duplicate side effect, migration divergence or contract
  mismatch. After every live round `pg_authid.rolpassword` for `app_worker_login` read null, the credential directory
  was empty, and no `SCRAM-SHA-256$` string appeared in any migrate, smoke or server log (counted: 0 in each).
- **Blocks the merge: nothing in this re-check.** Findings below are Low and Info. The merge still waits on what
  RFC-2026-002/025 require: a green required CI run on `f1f006a` (run `37298454559` was `in_progress` at both readings
  here, §5), the A1 and Q0 re-checks, and the Integration Owner's acceptance of the number 173 (`open_blockers[201]`
  (1)).
- **Q1, is migration 173 still exactly RFC-2026-028 §3.1-§3.3/§4/1? Yes.** The round changed three comment lines and
  no statement (`173_worker_login_identity.sql:81-83`, read in the diff). The `create role`, the `grant`, `set local
  createrole_self_grant = ''` and the apply-time block are byte-identical to what I reviewed at `b001495`.
  migrate-clean exits 0 and the post-migrate pass reads 54 / 38 / 16, as before. No fed source carries a credential
  (migrate-clean's rule 9 and `workerCredentialLint` green in r1).
- **Q2, are the pins and drifts complete and legitimate? Yes, and the round strengthened two of them.**
  - §5/10 now lists tables by `has_any_column_privilege` (`authz-proofs.mjs:1206`) and requires `app.jobs`
    (`:969`). Measured: 51 tables, every one with fixture rows as the connection role, every one zero through the
    login role. RFC §5/10's own drift turns it red now and did not at `b001495` (measured both, §2).
  - §5/12 refuses a trust line that reaches the role through a group, file, pattern, `samerole`/`samegroup` or a list
    other than `all` (`:1028`). Measured with two shapes (`+app_worker`, `/^app_worker_`), the second one the Author
    did not run live.
  - No pin was loosened. The probe counts and self-tests in migrate-clean are unchanged.
- **Q3, is Q-028-5 handled as the RFC recommends? Yes, unchanged.** D4 stands. The round does not touch `app.jobs`'
  columns.
- **Q4, is every decision named and recorded?** Named, yes: D13 (credential directory) and D14 (A1-173-1 (a) recorded
  in the RFC's Implemented line, not in the text of its approved sections). Recorded in plan §7, the handoff
  (`:48`, `:198`) and, for D13, `open_blockers[201]` (8). They are **not** in the disposition §4, where D1-D12 were
  recorded as the delegated answers (C0R-1).

## 2. Measured, with what

Every measured run used Node `v24.20.0`, from `/Users/bank/.local/node-v24.20.0/bin`, checked before each run. A PATH
Node 26 exists and was not used. PostgreSQL 17.11 from `/opt/homebrew/bin`. Cluster: `127.0.0.1:5505` only, `initdb
--locale=C -A trust -U postgres`, `-c listen_addresses=127.0.0.1 -c unix_socket_directories=''`, `LC_ALL=C`. The shim
ran first and every round re-ran `initdb`. Private directory `scratchpad/c0-173-workerr2/`, with `TMPDIR` inside it and
`RUNNER_TEMP` unset, so the harness's credential directory landed there too. The cluster was stopped and its data
directory removed after every round. Port 5505 had no listener at the end.

**Repository checks, on the branch NAME.** `agent/claude/WP-0A-DB-00-batch-173-worker` at `f1f006a` was checked out
with `--ignore-other-worktrees` (the name is checked out in other worktrees) and `git rev-parse --abbrev-ref HEAD`
read the name. No commit was made. I then returned to `recheck/c0-batch-173-worker`.

| command | result |
|---|---|
| `node scripts/verify-branch-scope.mjs aa0e89f WP-0A-DB-00` | exit 0, "all 20 changed path(s) are declared, and every amendment explains one" |
| `npm run check:handoff` | exit 0, "nothing substantive after its cited head" (the handoff cites `631512b`; `f1f006a` is the protocol commit) |
| `npm run verify` | exit 0, "clean: exit 0 — tests 691, pass 691, fail 0, skipped 0, todo 0" |

**Live rounds** (`make db-migrate-clean`, then `make db-rls-smoke`, `DB_TEST_URL=postgresql://postgres@127.0.0.1:5505/postgres`).

| round | drift | migrate-clean | rls-smoke | what it printed |
|---|---|---|---|---|
| r1 | none (head) | 0 (54 / 38 / 16) | 0 (1200 cases) | 13 discharged + 1 NOT RUN (`worker-login-authentication`). §5/10: "51 of 51 table(s) app_worker may SELECT hold rows", "every one of the 51 reads zero rows", control on `app.jobs` `[{"t":"app.jobs","n":"2"}] -> red`. A1-173-1: session start `{"cu":"app_worker_login","su":"app_worker_login","settings":"0"} -> starts`; self-set default `settings "1" -> red`; after `set local role` `cu "app_worker" -> red` |
| r2 | pg_hba `host all +app_worker 127.0.0.1/32 trust` first | 0 | **2** | `FAIL worker-login-authentication`, never NOT RUN |
| r3 | pg_hba `host all app_worker_login 127.0.0.1/32 scram-sha-256` first | 0 | 0 | `worker-login-authentication` RUN and ok; "14 claim(s) discharged" |
| r4 | RFC §5/10's drift `create policy c0_jobs_worker_reads on app.jobs for select to app_worker using (true);` appended to `140_audit.sql` (head) | **2** (policy set probe names `app.jobs.c0_jobs_worker_reads`) | **2** | `FAIL worker-login-reads-nothing-by-default`: "app_worker sees rows with no policy naming it: app.jobs (2)" |
| r5 | r4's drift on `b001495` (detached, the code before the round) | 2 | 2 (one isolation case) | `ok worker-login-reads-nothing-by-default`, "every one of the 22 reads zero rows", control on `app.workspaces`. **The commit's claim "it stayed ok before" is true** |
| r6 | pg_hba `host all /^app_worker_ 127.0.0.1/32 trust` first (a shape not run live by the Author) | 0 | **2** | "app_worker_login is a member of: app_worker, app_worker_login"; "pg_hba line(s) 1 trust app_worker_login by name or by a user list other than all (/^app_worker_)" |

After r4 and r5 `140_audit.sql` was restored with `cp`, `cmp` read it identical and `git diff --quiet` was clean.

**Records compared.** Every base (`aa0e89f`) `open_blockers` entry is still a byte prefix of its head entry (201 of
201). Between `b001495` and `f1f006a` only `[113]` and `[201]` changed, and only `open_blockers` in the manifest. In
`[113]`, the batch's own earlier "22 tables …" phrase was replaced by "51 … by table or column grant, app.jobs among
them" with the correction named. In `[201]`, the replaced phrases are the false "(inherit, bypassrls) … as measured
appended drifts" (my C0-2) and three phrase ends that were extended. CI run `37285050018` on `b001495`: `success`, and
its log reads `ok worker-login-authentication` and "14 claim(s) discharged". I read that log myself.

## 3. My earlier findings

| id | was | now | evidence |
|---|---|---|---|
| C0-1 | Low: `SET LOCAL` is a no-op in autocommit | **Resolved as recorded condition.** `open_blockers[201]` (2) now says 173 must run inside one transaction on the instance, and the platform runner's wrapping is read with Q-028-13's platform half. This is the remedy I offered. 173 is unchanged, which the remedy allowed. | manifest diff; 173 diff (comments only) |
| C0-2 | Low: inherit/createrole/superuser drifts claimed as the Author's measurement | **Resolved.** Plan D12 (`:116-119`), `[201]` (8), the handoff and the RFC Implemented line now say C0 measured them (and A1), not the Author. | word diffs of all four |
| C0-3 | Low: credential file under `os.tmpdir()`, unnamed | **Resolved.** `workerCredentialBase` (`authz-proofs.mjs:1063`) uses `RUNNER_TEMP` when set, else `tmpdir()`. Named D13 (plan §7, handoff `:198`, `[201]` (8) with the killed-run limit). Unit cases cover both branches. Measured: with `TMPDIR` private and `RUNNER_TEMP` unset, the directory was empty after all six rounds. Not recorded in the disposition (C0R-1). | r1-r6 |
| C0-4 | Info: VERIFICATION.md written ahead of its measurement | **No change needed.** `evidence/VERIFICATION.md` is unchanged since `eb413e9`, and its 691 / 691 is true at the head (measured). The plan's wording "re-recorded only after the refresh" is loose: no re-record was committed because nothing moved (C0R-2). | `git log -- evidence/VERIFICATION.md`; verify |
| C0-5 | Info: 173's comment said it reads `pg_default_acl`; snapshot lacks `valid_until` | **Resolved.** The comment now says default ACLs are covered through `pg_shdepend` (`173:81-83`), and `valid_until` is owed on `[201]` (2). | diff |
| C0-6 | Info: column named `password` refused | **Resolved as recorded.** Stated on `[201]` (8). | manifest |

I also read CI on `b001495` (my earlier §5 owed this). It ran §5/12 RUN and ok. Recording that on `[201]` (6) is the
Integration Owner's job, and the handoff says so.

## 4. New findings

| id | grade | where | finding | remedy |
|---|---|---|---|---|
| C0R-1 | Low | `evidence/WP-0A-DB-00/product-owner-disposition-2026-10-03-batch-173-worker.md:84-109`; plan `:86` (§4 lists D1-D12) | D13 and D14 are answered "as A0 recommends under the delegation" (handoff `:48`). Disposition §4 is where the delegated answers are recorded, and it says they are "recorded here and in plan §4". It was not updated in the round, and plan §4 still stops at D12; the two live only in plan §7's table, the handoff, and (D13 only) `[201]` (8). D14 also puts a substantive reading into an approved RFC's Implemented line. The approved sections are unchanged. The Implemented line now names the role among those who can mint its credential, and widens A1R-2. That is the kind of answer the Owner "may correct", so it should be where the Owner reads them. | Append D13 and D14 to the disposition §4 (and a pointer in plan §4), with their reasons, before or with the merge record. A1's acceptance of D14 as DATA-DEC-03's co-owner rides on its re-check and `open_blockers[199]`. No code change. |
| C0R-2 | Info | plan `:168` (§7 row C0-4) | "`evidence/VERIFICATION.md` is re-recorded only after the refresh in this round": the file was not touched in the round. Its content is true at the head (691 / 691, measured), so the record is not wrong, but no re-record happened. | None needed. Say "unchanged, still true" if the row is touched again. |
| C0R-3 | Info | `authz-proofs.mjs:1028` | `hbaRulesTrustingTheLogin` counts `trust` only. Other no-credential methods for a TCP login (`ident` against a responding ident server, for example) are not read. RFC §5/12 names `trust`, so this is within the RFC, not a gap in it. | None for this batch. A1 may weigh it for the provisioned instance's pg_hba reading (`[201]` (6)). |
| C0R-4 | Info | `authz-proofs.mjs:1253-1260` | A1-173-1's "self-set default" control sets the default as the superuser connection role under `SET LOCAL SESSION AUTHORIZATION`, not as the login role itself. The check reads identity and the settings row, so who set the row does not change its verdict (measured red, r1). That the role can set the row itself remains A1's measurement (L7), not the harness's. | None. A1's re-check may confirm. |

## 5. Claims checked

- **`631512b`'s message.**
  - The 22 -> 51 change, the `app.jobs` assertion, the control on `app.jobs`: true (r1).
  - The RFC drift turns the proof red now and stayed ok before: true (r4, r5).
  - `+app_worker trust` gives rls-smoke exit 2: true (r2).
  - The harness's session check and its two controls go red: true (r1).
  - D13: true (code and unit cases).
  - "two fresh base rounds on 127.0.0.1:5507 … 13 discharged + 1 NOT RUN; by-name scram RUN and ok (14)": not
    re-run on 5507. I reproduced the same outcomes on 5505 (r1, r3).
  - "npm run check exit 0, 691/691": I re-measured `npm run verify` at the head, 691 / 691.
- **`f1f006a`'s message.** "Nothing else changes": true. The commit touches the handoff alone, and `check:handoff`
  exits 0.
- **Plan §7.**
  - The cherry-pick map matches `git log`: the three `-x` trailers name `72808c7`, `dde46c0`, `faf6c60`; the review
    branches' worktrees sit at those SHAs.
  - The finding -> change rows match the diff.
  - The C0-4 row's wording is loose (C0R-2).
- **Disposition.** Unchanged in the round. It now trails the round's two named decisions (C0R-1).
- **Blocker edits.** These are §2's records compared: the base prefixes are kept, and only `[113]` and `[201]` change,
  as stated. `[201]` (10)-(12) name owners and reasons. (10) A1-173-3 is owed "before any credential exists outside
  a test run", which is consistent with D5 (173 is not applied to the instance).
- **RFC-2026-028.** One line changed (the Implemented line). Its new claims hold:
  - 51 tables, `app.jobs` asserted;
  - §5/5's scan half not implemented (Q0 F3, not re-measured by me);
  - §5/1's three drifts are C0's and A1's measurement.
  The RFC's integrity hash was regenerated and `npm run verify` passes.
- **Not-done list.** I agree with each reason as a matter of contract scope:
  - A1-173-3 needs two probes and their digests;
  - Q0 F3 is in a protected file;
  - 050 through the login role is now covered in part by the 51-table proof;
  - the runner does not exist yet;
  - the re-checks belong to the role runs.
  None of these is a contract mismatch on main if merged: none changes a pin, and 173 stays inert with no credential.

## 6. CI

PR #184's required check `bootstrap` on `f1f006a` (run `37298454559`) was `in_progress` at both readings. It is not
read here. A green conclusion on this head is owed before merge. The previous head's run (`37285050018`) was
`success`.

## 7. Limits

- I share the Author's model family (§0).
- I did not re-run D1-D11, A1's r8-r14, Q0's F3 scan measurement, or the C0-1 autocommit measurement. Each stands as
  recorded.
- I did not measure the platform (Q-028-13's platform half, Q170-c, Q-028-12), and I did not log in as the role to
  run `ALTER ROLE` itself (A1-173-1's L7 is A1's).
- I read the new foundation-contract assertions and ran them through `npm run verify`. I did not mutate them.
- Cleanup: the 5505 cluster was stopped and its data directory removed after every round. No listener remained on
  5505. The private credential directory was empty at every check.
