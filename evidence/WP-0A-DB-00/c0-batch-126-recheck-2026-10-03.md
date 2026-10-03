# C0 re-check: batch 126's review round

- **Reviewer run:** `/claude/c0_contract_reviewer`
- **Package:** `WP-0A-DB-00`
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-126`, PR #165, head `aacb62840314a9eebb72fb8f7b7e69021c79d3ca` (handoff only), round code `d482700`, record `3c8a494`, previous reviewed head `8932e61`, base `e5380b0` (main).
- **Author:** `/claude/a0_atlas`
- **Review branch:** I checked the head out into my own branch, `recheck/c0-batch-126-r2`, in an isolated worktree.
- **Earlier evidence:** `c0-batch-126-contract-review-2026-10-03.md` (F1-F5 on `8932e61`).
- **Date:** 2026-10-03
- **Status effect:** this file records findings. It does not approve, test-verify or integrate anything, and it does not advance any status.

## §0 What I am

I am a subagent that `/claude/a0_atlas`'s workflow launched. I share the Author's vendor and model family. Under RFC-2026-024, my run is the C0 role's evidence. Accepting it as that role's signature is for the Integration Owner and the Product Owner to decide. I did not write or edit any of the subject's files, and I fixed nothing. This is a narrow re-check of the review round (`8932e61..aacb628`), not a fresh review of the batch.

## §1 Measured vs read

**Measured (M).** I measured on a private PostgreSQL 17.11 cluster (`/opt/homebrew/bin`) at `127.0.0.1:5505`, TCP only, with `-c unix_socket_directories=''`. Setup was `initdb --locale=C -A trust -U postgres`, `LC_ALL=C`, the shim first, a fresh initdb every round, and Node `v24.20.0`. I saved a copy of `140_audit.sql` before the first round, appended drifts to it, and restored it byte for byte after every round. Its sha256 was `2ac596bb…c1ad37149` before the first round and after each round. At the end I stopped the cluster, removed `pgdata` and checked that port 5505 was free.

| Round | Input (appended to 140 unless stated) | migrate-clean | rls-smoke |
|---|---|---|---|
| B0 | head as committed | **0**: 16 probes, each refused each of its drifts and was clean again afterwards (pinned check 2, pinned trigger 2, pinned grant 3, rewrite rule 1, pg_catalog guard 1); 48 blocks (37 as written, 11 replaced) | **0** and **0**: 1058 of 1058, twice on the same database |
| D-ggo | `grant insert (deleted_at) on app.calendar_items to authenticated with grant option` | **2**: "unlisted: authenticated INSERT (deleted_at) …; unlisted: authenticated INSERT WITH GRANT OPTION (deleted_at) …" | 0 |
| D-tabown | a new NOLOGIN role made owner of `app.content_schedules` | **2**: "pinned table(s) owned by a role that is not a superuser … app.content_schedules (owner c0_owner)" | 0 |
| D-own | `alter function private.set_decided_at() owner to app_worker` | **2**: "private.set_decided_at() [owner is not the pinned owner]" | 0 |
| D-nn | `alter column created_at drop not null` on `app.approval_requests` | **2**: "pinned NOT NULL column(s) … app.approval_requests.created_at" | 0 |
| D-rule | `create rule c0_rule as on update to app.approval_requests do also nothing` | **2**: "rewrite rule(s) … app.approval_requests.c0_rule" | 2 (the 090 fixture's ON CONFLICT, as Q0 and the plan say) |
| S | as `postgres` on the loaded database after B0-style mc + rs, each write rolled back | n/a | see below |

Round S (as `postgres`, the superuser, on the settled request `87f78e21…`):
- changing `content_version_id` was refused with "a settled approval request keeps what it decided: every column but updated_at and updated_by";
- moving `created_at` back a day was refused with the same message;
- `approved` to `changes_requested` was refused with "a settled approval request keeps its status, decided_by and decided_at";
- an `updated_by` change was admitted, a no-op `set status = status` was admitted, and an UPDATE of the four pending rows was admitted;
- **deleting the request and inserting it again as `changes_requested` was admitted.** That is my F2, still open and now disclosed (§2).

On the branch **name** `agent/claude/WP-0A-DB-00-batch-126` at `aacb628`, not detached, with `origin/HEAD` set to `refs/remotes/origin/main`, and with the remote branch confirmed at `aacb628` by `git ls-remote`:
- `node scripts/verify-branch-scope.mjs e5380b0 WP-0A-DB-00` gave exit 0: "all 21 changed path(s) are declared, and every amendment explains one".
- `npm run check:handoff` gave exit 0: "describes the branch: nothing substantive after its cited head".
- `npm run verify` gave exit 0: "tests 675, pass 675, fail 0".

**A note on method.** My worktree's isolation refused a `git clone` into my private directory, so I could not use a fresh GitHub clone this time. Instead I checked the branch name out in my own worktree (`--ignore-other-worktrees`). Its local ref equalled `origin/agent/claude/WP-0A-DB-00-batch-126` (`aacb628`), and its `origin/HEAD` is `main`. I ran the three commands there, made no commit on that branch, and then returned to `recheck/c0-batch-126-r2`. The guard read the right branch, but this is a weaker setup than a clean clone.

**Read (R).** I read the following:
- `CONTRIBUTING_AGENTS.md`;
- the whole diff `8932e61..aacb628` for 126, 125.1, the 090 fixture, `psql-driver.mjs`, `rls-smoke.mjs` and `run.mjs`;
- the plan diff, including the new §7;
- the disposition diff;
- blocker 186's change, diffed sentence by sentence;
- the README section on the catalog-rule probes;
- the handoff's `tests` and `open_risks_or_blockers`;
- the stop-the-line sections of A1's and Q0's batch-126 evidence.

I did **not** re-run A0's lexer shapes (X1, L1-L3, set_config, M-LEX-*), M-FORGE, the static mutations, or the pg_catalog overload drift beyond its own self-test in B0. Where I rely on them, I mark them **(A0's)**. I did not verify CI on `aacb628`.

## §2 My F1-F5: how each was disposed

| My finding | Disposition on this head | Verdict |
|---|---|---|
| **F4 (LOW).** Merging answers O1, but the disposition said every answer is a forward change. | The sentence is withdrawn with the reason stated (disposition §3). O1 is recorded as ANSWERED before the merge by the Owner's words of 2026-10-03 (§5). | **Closed**, provided the Owner's words are as transcribed (see §3). |
| **F2 (INFO).** DELETE and re-INSERT overturns a settled request. | Not fixed, by choice. It is named in 126's header, in plan §3 "(15)/(16) boundary, DELETE", in plan §7, and in blocker 186's STILL OWED, as owed with RFC-2026-023 (no DELETE for that role, or a BEFORE DELETE refusal then). The reason given, not to pre-empt item (16)'s erasure route, is sound. | **Closed as disclosed.** Round S (M) confirms the gap is real and exactly as described: only the owner or a superuser can take it today. |
| **F3 (INFO).** The grant probe ignored grant options. | Both table and column privileges are now read with and without `WITH GRANT OPTION`. The drifts carry grant options. | **Closed.** D-ggo (M) refused, naming both rows. B0 (M) shows the column drift now names `UPDATE WITH GRANT OPTION (timezone)`. |
| **F5 (INFO).** The grant probe assumed a superuser table owner. | That assumption is now the probe's first rule, with its own drift. | **Closed.** D-tabown (M) refused, naming the owner. The rule runs before the privilege diff, so on a hosted cluster with a non-superuser owner the probe fails loudly and says why. Re-scoping the role set would still be needed there. That is a portability decision, not a defect. |
| **F1 (INFO).** The widened pair in 125.1 is dead, "word for word" was loose, and R2 gave the clause order reversed. | The first comment no longer says "word for word". The pair is marked "SUPERSEDED BY 126, BOTH ASSERTIONS BELOW, AND DEAD WHILE THE PAIR ABOVE PASSES", with the order `if not exists (<126's shape>) and not exists (<125's shape>)`. R2 now states the same order. | **Closed.** I read the file against the comment, and the order matches. B0 (M): 48 blocks, 11 replaced. The new body digest `48bcd0d0…` appears in 126's block, both 125.1 assertions and `PINNED_TRIGGER_FUNCTIONS`, and B0 passes with all of them. |

The other reviewers' findings that I re-measured in passing:
- Q0 F2: round S refused a moved version and a moved `created_at`.
- Q0 F5: D-rule.
- Q0 F8: D-own and D-nn.
- Q0 F3: the guard's own drift was refused in B0.

## §3 Is the disposition's transcription of the Owner's answers honest?

**Structurally, yes. I could not check the words themselves.**
- §5 gives the two sentences verbatim, both dated 2026-10-03. It says plainly that they reached the writing run through A0's workflow, that the reading "the second answers O1-O4" is the workflow's, that the run did not see the session, and that the English glosses are A0's.
- It does not stretch the words. `ทั้งหมดเอาตามที่คุณแนะนำเลย` is applied to O1-O4 only. `ok ลุยยาวๆไปเลย` is read as a go-ahead for the review round, not as a merge.
- It says outright that the merge of #165 still needs the Owner's words for #165. The plan, blocker 186 and the handoff's `open_risks_or_blockers` all say the same.
- O1-O4 are recorded as A0 recommended them, and each row's recommendation is unchanged from `8932e61` (diff, R).

**What I cannot confirm.** Neither sentence is in the task text this workflow gave me, so I have no independent sight of them. Their authenticity rests on A0's relay. The Integration Owner or the Product Owner should confirm them against the session.

**One loose summary (R1 below).** §5 says that C0, A1 and Q0 had each reported "nothing blocking the merge of #165". A1's §4 said no "with one condition on the record": blocker 186 should stop saying (12) is closed "anywhere psql would execute one". This head meets that condition, because the blocker, plan, README and run.mjs comment all now say "the shapes measured". So the summary is true of the state now, but it drops the condition A1 attached.

## §4 Are the plan, blocker, handoff and README claims true for this head?

**Measured or read true:**
- 16 probes in eleven families. That is the FK-support probe plus ten numbered rules, read in the README. B0 lists sixteen probe lines.
- Per-probe drift counts (pinned check 2, pinned trigger 2, pinned grant 3, rewrite rule 1, guard 1): measured in B0.
- 48 blocks, 37 as written and 11 replaced: measured.
- 1058 cases twice on one database: measured.
- 675 tests: measured.
- 21 paths in scope: measured.
- The handoff cites `3c8a494` and is alone in the last commit: `git show --stat aacb628` shows only the handoff file, and check:handoff passed (M).
- The (12) wording is narrowed everywhere I looked: the plan's §2 row, plan §3, the README, blocker 186 and the run.mjs comment. The new lexer comment says "The claim is the shapes measured and this list".
- The corrected description of the pg_catalog mechanism (an added overload, not a replaced built-in) agrees with how the guard is built. I read that the decision uses only `EXISTS` and OID comparisons, with formatting done after.
- Blocker 186's STILL OWED keeps the command-role half, DELETE, (16) and (20), and adds that 126 now freezes every column (16) must account for. That matches 126's header. `app.approval_requests` has no `deleted_at`, so freezing `requested_by` and `created_by` on settled rows is exactly what item (16)'s anonymisation route must answer (R: 090's columns).

**(A0's), not re-measured by me:**
- the lexer shapes giving mc 2 with no file created;
- M-FORGE giving mc 2;
- the twelve static mutations.

The static test passes on this head (M, inside `npm run verify`), but I did not mutate it.

## §5 Findings (most severe first)

### R1: INFO. The disposition's summary of A1's merge view drops A1's condition
- **Where:** `product-owner-disposition-2026-10-03-batch-126.md` §5, "(each: no stop-the-line, nothing blocking the merge of #165)".
- **What:** A1's §4 said nothing blocks the merge "with one condition on the record", the (12) wording. This head meets the condition, so nothing is wrong today. But the record paraphrases a conditional view as an unconditional one.
- **Remedy (optional):** Add "(A1: once blocker 186's (12) wording is corrected, done in this round)".

### R2: INFO. The lexer's fail-closed list is a list. One further class is not on it, and I did not measure it
- **Where:** `scripts/db/psql-driver.mjs`, the comment above `psqlLex`, and plan §7's "Limits by construction".
- **What:** I read the four new refusals (bare CR, any mention of `standard_conforming_strings`, a quote after an odd backslash run in a plain literal, and `e'` after `.` read as plain). For the encoding the files are written in, they are fail-closed for the reasons the comment gives. The list does not consider a session that changes its client encoding mid-file to one that psql lexes byte-wise differently. psql tracks that setting for the text that follows. A0's own limit already says the claim covers "the shapes measured and this list, nothing more", so this is within the disclosed limit. It is not a new departure from what is claimed. I did not construct or measure a shape for it.
- **Exposure:** the same as A1 F1 and Q0 F1: a migration or fixture author who can already run anything as the migration owner. No client surface.
- **Remedy:** In a later batch, either add client-encoding changes to the refused list (by mention, and keep in mind that `set_config` with a concatenated name also changes it), or pin the client encoding for the fed sessions and refuse non-ASCII bytes immediately before a backslash. Until then, name the class in the limit.

### R3: INFO. My verification of the branch name ran in my worktree, not a fresh clone
- **What:** See §1. The guard read the branch name and `origin/HEAD` = `main`, and the local ref equalled the remote's. A clean clone would rule out leftover local state. This is a limit of my method, not a defect in the subject.

There are no new LOW or higher findings. Every one of my earlier F1-F5 is closed or closed as disclosed.

## §6 Verdict

- **Stop-the-line: none.** I found no tenant leak, no exposed secret, no duplicate external side effect, no lost job, no migration divergence, no irreversible deletion and no contract mismatch.
  - 126 is not yet integrated, so editing it in place is allowed.
  - No integrated migration was modified in `8932e61..aacb628`. The only migration-tree changes are 126 itself and the 125.1 replacement block (R: diff).
  - 140 matched its original hash after every round.
- **Does anything block the Owner's merge? Nothing I found.** What remains are process preconditions under RFC-2026-002, not findings of this review:
  - the Owner's own words for merging #165 (the disposition and handoff both say so);
  - A1's and Q0's re-checks of this round;
  - the Integration Owner's evidence;
  - a green `bootstrap` CI run on `aacb628`, which I did not check.

  The Integration Owner or the Owner should also confirm the two 2026-10-03 sentences against the session (§3).

## §7 Limits

- I re-ran none of A0's lexer shapes, M-FORGE or the static mutations. My rounds were B0, D-ggo, D-tabown, D-own, D-nn, D-rule and S.
- I did not exercise the lexer adversarially. R2 comes from reading only.
- I did not check CI on `aacb628` or the PR body on GitHub.
- I could not take a fresh clone (R3).
- My scripts and logs are in my private scratch directory `c0-126r2/`, which is not part of the repository.
