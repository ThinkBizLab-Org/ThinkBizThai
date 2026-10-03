# C0 contract review: batch 126 (hardening batch, blocker 186 items 11-15, 17-19; batch 091 items owed)

- **Reviewer run:** `/claude/c0_contract_reviewer`
- **Package:** `WP-0A-DB-00`
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-126`, PR #165, head `8932e611551acddcc4b417129c4b45632fccfa35` (handoff only), code `f421764d5a8675b5015d3a1581f2755038cf9ddb`, base `e5380b0` (main).
- **Author:** `/claude/a0_atlas`
- **Review branch:** I checked the head out into my own branch, `review/c0-batch-126`, in an isolated worktree.
- **Date:** 2026-10-03
- **Status effect:** this file records findings. It does not approve, test-verify or integrate anything, and it does not advance any status.

## §0 What I am

I am a subagent that `/claude/a0_atlas`'s workflow launched. I share the Author's vendor and model family. Under RFC-2026-024, my run is the C0 role's evidence. Accepting it as that role's signature is for the Integration Owner and the Product Owner to decide. I did not write or edit any of the subject's files. I fixed nothing.

## §1 Measured vs read

**Measured (M).** Measured on a private PostgreSQL 17.11 cluster (`/opt/homebrew/bin`) at `127.0.0.1:5505`, TCP only, with `-c unix_socket_directories=''`. Setup was `initdb --locale=C -A trust -U postgres`, `LC_ALL=C`, the shim first, a fresh initdb every round, and Node `v24.20.0`. Drifts were appended to `140_audit.sql`. After each round I restored that file byte for byte and checked it against sha256 `2ac596bb…c1ad37149`, which matched before the first round and after the last. At the end I stopped the cluster, removed `pgdata` and checked that port 5505 was free.

| Round | Input | migrate-clean | rls-smoke |
|---|---|---|---|
| B0 | head as committed | **0**: 14 probes, each refused every one of its drifts and was clean again afterwards; 48 blocks (37 as written, 11 replaced) | **0**: 1058 of 1058 |
| S1-S5 | scenario SQL as `postgres` (superuser, the 090 fixture's loader), every write rolled back | n/a | see §2 Q1 |
| DNOW | 126's body with `now()` in place of `statement_timestamp()` | **2**: pinned trigger probe, "body differs from the pinned digest" | **2**: `approver-a-cannot-backdate-a-decision` and `-postdate-` fail |
| DGO | `grant update (timezone) on app.calendar_items to authenticated with grant option` | **0** | **0** (F3) |

I ran these on a fresh clone from GitHub. It was checked out on the branch **name** `agent/claude/WP-0A-DB-00-batch-126` at `8932e61`, not detached, with `origin/HEAD` set to `main`:
- `node scripts/verify-branch-scope.mjs e5380b0 WP-0A-DB-00` gave exit 0: "all 18 changed path(s) are declared, and every amendment explains one".
- `npm run check:handoff` gave exit 0: "describes the branch: nothing substantive after its cited head".
- `npm run verify` gave exit 0: 675 of 675 tests passed.

One note on method. My first clone was taken from the local worktree, so its `origin/HEAD` was the review branch. On that clone `check:handoff` exited 91, which was an artifact of my own setup. The GitHub clone is the one that counts.

Other measurements:
- Using the guard's own `stripNonCode` count, `foundation-contract.test.mjs` makes 418 assertions across 72 tests. That equals the new floor.
- The merge commit `e5380b0` has parents `86f55d2` and `7c1537a`, with a commit time of 2026-10-03T07:02:38Z.

**Read (R).** I read the following:
- `CONTRIBUTING_AGENTS.md`
- the plan and the disposition
- the whole diff `e5380b0..8932e61`
- blocker 186's text
- `superseded.json` and both versions of 125
- `091_calendar.sql`, specifically its grants
- the batch-091 third-round re-checks by C0 (H1, H3) and A1 (R1, R3, R4)
- the batch-123 and batch-125 manifests, for the amendment precedent

Of the batch-125 reviews, I read only the passages that blocker 186 quotes. I did **not** re-run A0's own drift and mutation rounds (D12 to M-DEF in plan §6). Where I rely on them below, I mark them **(A0's)**. I did not verify CI run 37103243716, and I did not verify the Owner's first quoted sentence. The second sentence, `ใช่ merge ทำต่อได้เลย`, is the user request that this workflow relayed to me verbatim.

## §2 The questions

**Q1. Does each closed item do what blocker 186's remedy asked, and is every departure disclosed?** Yes, with two INFO-level gaps in the disclosures (F2, F3).

- **(11)** Done as asked:
  - a drift counts only on an explicit match: P0001, the rule's prefix, the objects named, one ERROR line, and the markers;
  - a refused count that differs from the declared count fails;
  - the static test drives each real drift job with a pass, a non-P0001 error and further wrong outcomes (R: `foundation-contract.test.mjs` ~2470-2495);
  - each raise now names its object.
- **(12)** Done as asked, using `psqlLex`:
  - migrations and the prerequisite are scanned before the first one is applied (R: `run.mjs` runLive);
  - replacements are scanned in `postMigratePlan`;
  - the helper and the fixtures are scanned in `rls-smoke.mjs`;
  - drifts and probe SQL are scanned in `unsafeDrifts`, before any job is fed;
  - `TRANSACTION_CONTROL` is anchored to the statement head.

  The remedy asked for "a check that each drift's transaction reached its rollback". It is met by the equal-txid markers before and after the drift: a drift that ended its transaction changes the id. That is equivalent to the remedy, though not literally the same thing. I read the lexer against psql's rules (literals, E-strings, dollar quotes, nested comments, statement splitting at paren depth 0) and found no gap. The `begin atomic` over-refusal is disclosed.
- **(13)** Done, and goes further than asked. Every non-internal trigger on `approval_requests` is pinned by `pg_get_triggerdef`, and every function they run is pinned by body md5, security, `search_path` and PUBLIC EXECUTE. DNOW (M) shows the digest catching a one-word body change.
- **(14)** Done as asked: a rule refuses any `pg_parameter_acl` grant to a non-superuser, and it has its drift. B0 (M) shows the drift refused.
- **(15)**
  - Done, except the command-role half, which is disclosed with its reason (RFC-2026-023).
  - S2 (M): the superuser loader cannot move a cancelled request back to `pending`. It gets "a settled approval request keeps its status, decided_by and decided_at".
  - S1 (M): an INSERT that names a decider and sends `decided_at` 2001 is recorded at the statement's time.
  - The 090 fixture's DO block proves N4 and N11 on every rls-smoke run (R, plus B0 green).
  - The freeze covers UPDATE only. See F2.
- **(17)** Done as asked:
  - `statement_timestamp()` replaces `now()`;
  - the CHECK is added, pinned in `PINNED_CHECKS` and asserted in 126's block;
  - S4 (M): moving a settled row's `created_at` past `decided_at` is refused by the CHECK;
  - DNOW (M): reverting to `now()` fails both the probe and two rls-smoke cases. So the cases really do tell the two clocks apart, which the plan claimed but did not show for this mutation.
- **(18)** Done as asked: exemptions and the stale check are keyed by `schema.table.constraint`, and drift 1 adds a namesake key (R, plus B0).
- **(19)** Done as asked: a `like '%\_by'` assertion, plus a negative match for `=`, `in` and `~` (R).
- **Not done:** items (16) and (20), C0 H1's optional case, and A5's (h). All of these are disclosed in the plan's §3 and §5, in the blocker and in `not_done`.

**Q2. Is 126 a correct forward fix, and is the 125 replacement legitimate?** Yes.

- The diff shows no migration file modified. The only migration in the diff is the new file 126 (R: `git diff --name-status`).
- 126 uses `create or replace` with the same name, SECURITY INVOKER, empty `search_path` and revoked EXECUTE. It recreates the trigger and adds a CHECK. Its own block asserts all three by exact text (R: lines 92-116).
- The replacement meets the three guards of the post-migrate pass, measured in B0:
  - 125's block, run as written, fails at its trigger assertion with the recorded `fails_with`;
  - the replacement passes;
  - the register entry names 126.
- The replacement first asserts 126's final state strictly. It then keeps 125's two assertions, each OR-widened to admit 126's shape. That is additive and fails closed. The widened pair is now dead code (F1).

**Q3. Are O1-O4 stated honestly with real alternatives, and does any need deciding before merge?**

- Each question states a real alternative and gives its cost.
- O2, O3 and O4 can be reversed after merge by a forward migration. No approval rows exist anywhere before G0, so none of them needs an answer before merge.
- **O1 is different.** Once 126 merges, it is integrated and can never be renumbered. Merging therefore answers O1 in practice. The disposition says "any other answer is a forward change", and that is not true for O1 (F4). This does not block the merge. The Owner should simply know that pressing merge is the answer to O1.

**Q4. Do the grant allowlist and the default pin match §4.7/§8.3 and DEC-UX-06?** Yes.

- `PINNED_GRANTS` is exactly 091's six `grant select/insert/update (…) … to authenticated` statements: 12+7+6 columns on `calendar_items` and 13+6+5 on `content_schedules`, 49 in all (R: `091_calendar.sql` 224-246).
- No table-level grants and no grants to other roles, which matches 091's "anon and app_worker get nothing" (R).
- B0 (M) shows the effective catalog equals the pinned list.
- The static test ties the two together by regex.
- §8.3's who-may-do-what lives in the policies, not in the grants, and this batch does not touch it.
- `'Asia/Bangkok'::text` matches DEC-UX-06 ("Asia/Bangkok default", mobile core-flow spec line 926) and 091's default.
- One limit: the pin covers the default expression only. A later BEFORE INSERT trigger on `calendar_items` that rewrites the zone would not be seen by it (§5).

**Q5. Are the ownership amendments justified by precedent?** Yes.

- The three files are `test-suite-contract.mjs`, `branch-identity.test.mjs` and `integrity-manifest.json`.
- The same three were amended by batches 123 and 125, together with VERIFICATION.md (R: their manifests at `7f6cefb^2` and `86f55d2^2`).
- Leaving out VERIFICATION.md and CI is correct, because the suite count is unchanged at 675 (M).
- The floor of 418 is the guard's own count (M).
- The scope check is green (M).

**Are the claims true?** The commit messages, plan, disposition, blocker edits and handoff agree with what I measured or read:
- 14 probes, 48 blocks and 1058 cases;
- 675 tests and 418 assertions;
- the #164 merge facts: head `7c1537a` and 07:02:38Z;
- branch slots moved from 091 to 126;
- the blocker edit's CLOSED BY BATCH 126 paragraph keeps (15)'s command-role half, (16) and (20) as owed.

The disposition labels itself A0's transcription, and it keeps the RFC-2026-025 §5 points open. Where I could check a quote, it is honest. The plan's phrase "widened with `and not exists (<126's shape>)`" describes the clauses in reverse order from the file. The logic is the same (F1).

## §3 Findings (most severe first)

### F4: LOW. O1 is settled by the merge, and the disposition says every answer is a forward change
- **Where:** `product-owner-disposition-2026-10-03-batch-126.md` §3 ("any other answer is a forward change"), row O1.
- **What:** An integrated migration is never rewritten or renumbered (CONTRIBUTING_AGENTS.md). If the Owner says "no" to O1 after merging, nothing can be changed.
- **Remedy:** Add one sentence saying that merging #165 answers O1 "yes". The alternative is for the Owner to answer O1 before pressing merge.

### F2: INFO. The freeze covers UPDATE. A writer holding DELETE can overturn a settled request by deleting and re-inserting it
- **Where:** `126_approval_decision_frozen_for_every_writer.sql:16-22`, and plan §3, "(15)/(16) boundary".
- **Measured (S3):**
  - As `postgres`, I deleted the settled request `87f78e21…`. It has no `approval_events` rows, so the FK did not stop the delete.
  - I re-inserted it with `status = 'changes_requested'`. The insert succeeded, kept the original `decided_by`, and got `decided_at` set to the statement's time.
  - That is A1's N4 outcome, reached without an UPDATE.
- **Today:** only the owner/superuser holds DELETE (M: S5, where `app_command`, `app_worker`, `app_maintenance` and `service_role` hold none). That writer can also disable triggers, and the plan discloses that. No exposure.
- **Remedy:** Name DELETE/re-INSERT in plan §3 and blocker 186's (15) boundary. When RFC-2026-023's command role is decided, either give it no DELETE or add a BEFORE DELETE refusal for settled rows.

### F3: INFO. The grant probe reads privileges, not grant options
- **Where:** `scripts/db/run.mjs`, `PINNED_GRANT_PROBE_SQL`.
- **Measured (DGO):** `… to authenticated with grant option` on an allowlisted column passed every layer (mc 0, rs 0).
- **Exposure:** None today. A client reaches the database only through policies and RPCs, and issues no DDL. A holder of the option could still re-grant the column to another role, and that re-grant would then be caught as unlisted.
- **Remedy:** Compare `aclexplode(...).is_grantable` as well, or record this limit in plan §3.

### F5: INFO. The grant probe's role set assumes the table owner is a superuser
- **Where:** `PINNED_GRANT_PROBE_SQL`, `where not rolsuper and rolname !~ '^pg_'`.
- **What:** On the test cluster the owner is `postgres`, a superuser. On a cluster where the owner is not a superuser (a hosted platform), the owner's implicit privileges would all show up as "unlisted". The probe runs only on `migrate-clean` against the test cluster, so this is a portability limit, not a defect.
- **Remedy:** One line in plan §3, or exclude the table owner explicitly.

### F1: INFO. The 125 replacement's widened assertions are dead code, and "word for word" is loose
- **Where:** `db/foundation/invariants/125_approval_settled_is_immutable.1.sql:33-58`, and plan §4 R2.
- **What:** If the strict pair at lines 18-32 passes, the widened pair always passes. The 125 conditions also appear with a 126 conjunct added, which makes them not word for word as `superseded.json` `_editing` describes. The widening is disclosed in the file's own comment and in R2.
- **Remedy (optional):** Mark the widened pair as SUPERSEDED BY 126 in the comment, or drop it. The plan's sentence should give the order the clauses actually appear in.

Also noted, not graded: the second branch of 126's body (`old.decided_by is not null …`) cannot be reached any more. Under 090's CHECKs, a row with a decider is never `pending`, so the first branch catches it first. It is harmless.

## §4 Verdict

- **Stop-the-line: none.** I found no tenant leak, no exposed secret, no duplicate external side effect, no lost job, no migration divergence, no irreversible deletion and no contract mismatch. No integrated migration was rewritten.
- **Blocks the Owner's merge: nothing I found.** F4 asks the Owner to know that merging answers O1. The process preconditions of RFC-2026-002 still apply: Q0's and A1's role runs, the Integration Owner's evidence, and a green `bootstrap` run on the head. They are not findings of this review.

## §5 Limits

- I re-ran none of A0's D12-M-DEF drift and mutation rounds. My own rounds were B0, S1-S5, DNOW and DGO.
- I did not exercise the psql lexer against psql adversarially. My judgement of it comes from reading.
- The default pin and the pinned trigger probe do not cover a BEFORE INSERT trigger on `calendar_items` that rewrites `timezone`. I did not measure that.
- I did not check CI run 37103243716 or the GitHub merge record beyond the git object.
- The batch-125 reviews were read only through blocker 186's quotations of them.
- Scripts and logs are in my private scratch directory `c0-126/`, which is not part of the repository.
