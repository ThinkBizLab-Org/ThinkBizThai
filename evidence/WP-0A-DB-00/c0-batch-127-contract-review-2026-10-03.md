# C0 contract review: batch 127 (created_by at INSERT is the caller; every client-writable table's permissive set pinned)

- **Reviewer run:** `/claude/c0_contract_reviewer`
- **Package:** `WP-0A-DB-00`
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-127`, PR #166 (Draft), head `75dae71bbf20c1dc7be59e49d5433a490b3e5904` (handoff only), code `4fef70a`, base `3f80599` (main).
- **Author:** `/claude/a0_atlas`
- **Review branch:** I checked the head out into my own branch, `review/c0-batch-127`, in an isolated worktree.
- **Date:** 2026-10-03
- **Status effect:** this file records findings. It does not approve, test-verify or integrate anything, and it does not advance any status.

## §0 What I am

I am a subagent that `/claude/a0_atlas`'s workflow launched. I share the Author's vendor and model family. Under RFC-2026-024, my run is the C0 role's evidence. Accepting it as that role's signature is for the Integration Owner and the Product Owner to decide. I did not write or edit any of the subject's files, and I fixed nothing.

## §1 Measured vs read

**Measured (M).** I used a private PostgreSQL 17.11 cluster (`/opt/homebrew/bin`) at `127.0.0.1:5505`, TCP only (`-c unix_socket_directories=''`). Setup:
- `initdb --locale=C -A trust -U postgres` and `LC_ALL=C`;
- the shim first;
- a fresh initdb every round;
- Node `v24.20.0` first on PATH.

Drifts were appended to `140_audit.sql`. After every round I restored that file and compared it byte for byte with a saved copy (sha1 `2ac2fc2c…3093b782`). It matched after every round and at the end. At the end I stopped the cluster, removed its data directory and checked that port 5505 had no listener.

| Round | Input (appended to 140) | migrate-clean | rls-smoke |
|---|---|---|---|
| B0 | head as committed | **0**: 19 catalog probes, each refused its drift and was clean again; post-migrate pass 49 blocks (37 as written, 12 replaced) | **0**: 1077 of 1077 |
| D1 (A0's, reproduced) | the 24 permissive INSERT policies each given a `_loose` sibling with the created_by clause removed, generated from the catalog | **2**: the permissive policy probe names all 24 siblings on all 19 tables | **0**: 1077 |
| D7 (A0's, reproduced) | `alter policy user_profiles_update_own … using (true) with check (true)` | **2**: permissive probe | **0** (see F5) |
| X11 | approval_policies: closure dropped, plus a looser INSERT sibling without created_by | **2**: the created_by closure probe ("has no approval_policies_created_by_is_caller") and the permissive probe | **2**: exactly `owner-a-cannot-forge-created-by-alone-on-an-approval-policy` |
| X5 | permissive INSERT `TO public with check (true)` on content_ideas | **2**: permissive probe | **2**: `viewer-a-cannot-capture-a-content-idea` |
| X7 | `grant insert` to anon, plus an anon INSERT policy on content_ideas | **2**: permissive probe | 0 |
| X1 | `member_scope_covers_business` and `member_scope_admits_business` replaced by `select true` (invoker functions; policy deparse unchanged) | **0** | **2**: 40 of 1077 (F4) |
| X2 / X3 | `content_items_scope_narrowing` / `asset_rights_scope_narrows_member` set to `using (true) with check (true)` | **2**: the 080 / 100 replacement blocks | **2** |
| X2b / X2c | the same narrowings with `… or true` added (tokens kept) on industry_assignments / content_items | **0** | **2**: 1 and 3 cases (F3) |
| X4 | permissive `select … using (true)` on content_versions (a client-readable table that clients cannot write) | 0 | 0. It is contained: the restrictive narrowing resolves through content_items, and as workspace B's owner I read only B's row. |
| X4b/c/d | the same on billing_subscriptions, quota_buckets, workspace_members | **0** | **2**: 5, 6 and 3 cases (F2) |
| X6 | `grant truncate on app.content_items to authenticated` | **0** | **0** (F1) |

**Checks I ran directly on the cluster (M):**
- **TRUNCATE as a client.** In a rolled-back transaction I granted TRUNCATE on `app.notifications` to authenticated. Workspace B's owner, as `authenticated`, then truncated rows of **both** workspaces: 4 rows across 2 workspaces became 0. On the clean set no client role holds TRUNCATE, REFERENCES or TRIGGER on any table in app, private or public.
- **Encoding change the lexer admits.** `psqlLex` has no finding for `do $$ begin execute 'set names ''SJIS'''; end $$;`. Fed through psql, that statement set `:ENCODING` and `client_encoding` to `SJIS`. Shapes the lexer refuses: `set client_encoding`, `set names` (bare, `session`/`local`, after a comment, with a newline inside), and `alter role … set client_encoding`. Shapes it admits: `set_config('client_' || 'encoding', …)` and the `$$`-quoted concatenation. Those two are A0's declared limit.

**The catalog, on B0** (`search_path = pg_catalog`):
- **created_by.** Across every non-system schema, `has_column_privilege('authenticated', …, 'INSERT')` on `created_by` gives **19 tables, all in `app`**. All 19 have RLS enabled and forced, `created_by` nullable with no default, and anon has no INSERT on it.
  - The 19 names are exactly `CREATED_BY_CLOSURES`, the list in 127 and the list in the plan.
  - No client role may UPDATE `created_by` anywhere.
  - On these tables: 24 permissive INSERT policies, all opening `(created_by = ( SELECT auth.uid() AS uid)) AND`, and 19 restrictive created_by closures.
- **`*_by` columns.** Client-insertable `*_by` columns in every schema: 35 = created_by on 19 + updated_by on 14 + requested_by on 2, as the plan says.
- **Client-writable relations.** Any relation kind, any non-system schema, anon or authenticated, counting INSERT, UPDATE, DELETE or TRUNCATE: exactly the **25 app tables** of the plan.
  - Every one has RLS enabled and forced.
  - anon holds nothing on them.
  - Permissive policies: 24 INSERT on 19 tables, 25 SELECT on 25, 25 UPDATE on 21. That is 74, all `TO authenticated`, none FOR ALL or DELETE.
- **Schema privileges.** authenticated has USAGE on `app` and `public`, and CREATE on neither. anon has USAGE on `public`.
- **Helper functions.** `is_active_member` and `workspace_member_role` are SECURITY DEFINER, so the security definer probe pins their bodies. `member_scope_covers_*` and `member_scope_admits_*` are invoker functions, and nothing pins their bodies.

**Commands on a fresh GitHub clone** (private dir), on the branch **name** `agent/claude/WP-0A-DB-00-batch-127` at `75dae71`, not detached, with `origin/HEAD` set to `main`:
- `node scripts/verify-branch-scope.mjs 3f80599 WP-0A-DB-00` exited 0: "all 25 changed path(s) are declared, and every amendment explains one". The plan's "24" is at `4fef70a`, before the plan commit, and is consistent with this.
- `npm run check:handoff` exited 0: "describes the branch: nothing substantive after its cited head".
- `npm run verify` exited 0: tests 677, pass 677.

**Other checks (M):**
- **Cherry-picks.** `e5104bf` and `ef37f48` have the same stable patch-id (`79b289db…`). So do `fb39bb4` and `e729a57` (`b5866911…`). "Cherry-picked unchanged" is true.
- **CI for #166.** "Bootstrap validation" run 37116932386 on head `75dae71` concluded SUCCESS (`gh pr view 166`). A0 had listed checking CI as not done.
- **#165.** `gh` shows it merged at 2026-10-03T10:08:51Z, head `84df4d4`, merge commit `3f80599`. Run 37111859581 ("Bootstrap validation", `pull_request`) succeeded on `84df4d4`. Every claim in the disposition's §3 is true.

**Read (R):**
- `CONTRIBUTING_AGENTS.md`;
- the plan and the disposition;
- the whole diff `3f80599..75dae71`, closely for 127, `run.mjs` §2–2b'', `psql-driver.mjs`, `091_calendar.1.sql`, the seven widened replacements and `superseded.json`;
- blocker 186: the text before and after, diffed;
- the commit messages and the handoff;
- §7–§8 of `docs/sprint-0a/sprint-0a-core-erd-rls-retention-th.md`.

Not done or not verified:
- I did not re-run A0's D2–D6, L1–L3 or M1–M4 (where I rely on them I mark them **(A0's)**), or A0's private twins script.
- I did not verify the content of A0's message to the Owner. The Owner's words `คุณลุยตามที่แนะนำได้เลย` are the user request this workflow relayed to me verbatim. What they replied to I know only from A0's disposition.

## §2 The questions

**Q1. Does 127 close the created_by-at-INSERT class as blocker 186 and A1 F5 on 123 asked, on exactly the right table set?** Yes.
- **The table set.** I measured it from the catalog across every non-system schema, not just `app`. It is 19 tables, equal to 127's list, `CREATED_BY_CLOSURES` and the plan. Blocker 186 named 17, and A1 F3 on 091 named the other 2.
- **The closure.** Each table has a restrictive, INSERT-only, `TO authenticated` closure with no USING and an equality check. Equality refuses nothing that works today: all 24 permissive policies already lead with the same equality (measured).
- **127's own block.** It has no fixed count and also requires RLS enabled and forced.
- **The probes.** The closure probe pins the 19 by exact deparse. The INSERT coverage probe closes item (8)'s INSERT half.
- **The rls-smoke family.** It forges created_by **alone**, which is what A1 F5 asked for. X11 shows a case is load-bearing on a table where no pre-127 case was: rls-smoke failed exactly that table's new case.
- **Limits, already disclosed.** The closure binds `authenticated` only (item (9), A1 N2). It also binds only through the grant: X7 shows an anon policy is refused by the permissive probe, not by the closure rules. Both are recorded.

**Q2. Is the permissive-set pin correct and complete for every client-writable table, and does it match each table's governing §8 row?**
- **Correct and complete for what it states.** The writable set the probe derives equals my all-schema measurement. The 74 pinned entries equal the catalog, and D1, D7, X5, X7 and X11 are each refused by name.
- **§8.** I compared every write policy's role set with its §8 row. No mismatch:
  - business, page and industry: owner/admin `Y`, scoped editor `P`;
  - knowledge and content: owner/admin/editor;
  - asset rights: owner/admin, editor `N`;
  - approval policy: owner/admin;
  - request create/cancel: owner/admin/editor;
  - decide: owner and approver (admin and editor `P`, refused);
  - calendar, schedule and publish intent: owner/admin;
  - workspace update, invite and scope: owner only (admin `P`, refused);
  - profile and notification: own rows (`O`);
  - immutable versions: INSERT and SELECT only.
- **What the pin cannot do.** It freezes current state. It does not derive that state from §8, so a future §8 change has to be made in two places. That is A0's stated design (§5.4).
- **Three edges.** The pin is a deparse. It does not pin the invoker functions the policies call (F4), it does not cover client-*readable* tables (F2), and its idea of "writable" leaves out TRUNCATE (F1). F1 and F2 lie outside what the Owner asked ("every client-writable table") as A0 defined it. None of the three is a regression.

**Q3. Are the post-migrate replacements (091.1 and the widened 030/040/080/081/090/100/120) legitimate, additive-only and honest?** Yes.
- **091.1.** It asserts the final-state set first and whole. It then keeps 091's two assertions word for word, with only 127's (table, name) pair excluded through a join marked `SUPERSEDED BY 127`.
- **The seven widened replacements.** Each adds 127's closure name to its exact restrictive list, or to its exclusion list. Each change is marked, and no assertion is weakened.
- **`fails_with`.** The new counts (030 4→5, 040 6→8, 080 14→16, 090 13→15, 100 12→14) are one more per table that 127 touches.
- **120.** Its `fails_with` is unchanged, and correctly so. The original block's first failure is still 122's TO PUBLIC closure, and 127's closure is `TO authenticated`.
- **Measurement.** B0's pass reports 49 blocks, 12 replaced. X2 and X3 show the 080 and 100 replacements still refuse a narrowing replaced by `true`.

**Q4. Is the disposition an honest transcription, and is A0's reading of a general "go ahead as you recommend" as a merge instruction for #165 disclosed as a reading?** Mostly yes, with one wording point (F7).
- **The words.** They are verbatim, and they match the request relayed to me.
- **The reading.** The four-point table labels the interpretation "A0's reading" throughout. It says "Where this reading is wrong, the Owner's correction replaces it." It does not claim to meet RFC-2026-002's rule literally, and it keeps the RFC-2026-025 §5 points open.
- **The over-statement.** §3 then states as fact "the words above are that decision for #165" and "A0 EXECUTED the Owner's decision". Those sentences present a reading as a fact.

**Q5. Are the ownership amendments justified?** Yes.
- Four files are amended outside ownership. Each has one stated reason:
  - `scripts/test-suite-contract.mjs`: the guard's own floors, plus one test in each of two suites;
  - `evidence/VERIFICATION.md`: the suite count 675→677, by the repository's recorder;
  - `test-kits/branch-identity.test.mjs`: the branch slot, since 126 merged as #165;
  - `test-kits/integrity-manifest.json`: regenerated.
- The pattern follows batches 125 and 126. CI is not touched, which is correct: 127 adds no table, and each new case falls inside an existing negative-control pattern.
- `verify-branch-scope` exits 0 on the branch name.

**Claims in the commit messages, plan, disposition, blocker edits and handoff.** Every number I re-measured is true:
- 19 tables, 24 policies, 35 columns, 25 tables, 74 policies, 19 probes, 49/37/12 blocks, 1077 cases and 677 tests;
- D1's "fails migrate-clean by name on all 19, rls-smoke green";
- D7's "only the permissive probe holds this";
- the cherry-picks, the #165 facts and CI.

Two statements are wider than what I measured:
- The handoff's known limitation and plan §5.5 say "the [restrictive policies] that carry a guarantee are pinned by their own probes" (F3).
- Blocker 186 and the plan say that "a change of client encoding by any spelled mention of client_encoding or a SET NAMES statement is refused" (F6).

## §3 Findings

Grades: HIGH, MEDIUM, LOW, INFO. None is introduced by 127 as a regression. None is reachable by a client on the clean set.

- **F1, LOW (pre-existing class; nothing writes it today).**
  - *What.* Nothing stops a later file from granting TRUNCATE (or TRIGGER or REFERENCES) on an app table to a client role.
  - *Where.* `scripts/db/run.mjs:379-390`: the probe's `writable` predicate reads INSERT, UPDATE and DELETE only. The pinned grant probe covers only `calendar_items` and `content_schedules` (run.mjs ~756).
  - *Measured.* X6 passes every layer, and TRUNCATE skips row level security. On `app.notifications`, workspace B's owner wiped workspace A's rows (rolled back). That is the tenant-leakage and irreversible-deletion class, reachable only by a later edit.
  - *Remedy.* A catalog rule, with its own drift, that no role in {anon, authenticated, PUBLIC} holds TRUNCATE, TRIGGER, REFERENCES or MAINTAIN on any table in app, private or public. Or extend the pinned grant probe to every app table.
- **F2, LOW (outside the Owner's stated scope; disclose).**
  - *What.* A permissive SELECT sibling `using (true)` on a client-readable table that clients cannot write fails only rls-smoke.
  - *Where.* `run.mjs:303` (PERMISSIVE_POLICIES): the 16 SELECT-only app tables are not pinned.
  - *Measured.* X4b/c/d on billing_subscriptions, quota_buckets and workspace_members fail rls-smoke only. On content_versions (X4) it is contained by the restrictive narrowing.
  - *Remedy.* Extend the probe's set to every app table a client may SELECT. Or record this as the probe's stated edge in the README, plan and handoff, which today say only "client-writable".
- **F3, LOW (wording; pre-existing class).**
  - *What.* The statement in plan §5.5 and the handoff's `known_limitations` ("the [restrictive policies] that carry a guarantee are pinned by their own probes") is true only for the closures and for `PINNED_POLICIES`, which pins 091's and 125's.
  - *Measured.* The member-scope narrowings on the other tables are checked by the replacement blocks for **tokens**. `… or true` (X2b on industry_assignments, X2c on content_items) passes migrate-clean and is held by rls-smoke alone (1 and 3 cases).
  - *Remedy.* Reword. Or add the remaining `*_scope_narrow*` policies to `PINNED_POLICIES` by exact deparse.
- **F4, INFO (pre-existing).**
  - *What.* The permissive pin is a deparse. Replacing the body of an invoker helper the policies call widens them while the deparse stays the same.
  - *Measured.* X1 replaced `member_scope_covers_business` and `member_scope_admits_business` with `true`. migrate-clean passed, and rls-smoke failed 40 cases.
  - *Remedy.* Pin body digests of every function a pinned policy calls, as the security definer probe does.
- **F5, INFO.**
  - *What.* A1-style coverage: D7 shows no rls-smoke case refuses a member updating **another** user's profile. The new probe is the only layer that holds it.
  - *Remedy.* Add a `user-a-cannot-update-user-b-profile` case, in §8.6's sense of "own row".
- **F6, LOW (the claim is wider than the rule; same family as A0's declared limit).**
  - *What.* The rule is described as refusing "any spelled … SET NAMES statement". Its regex reads only the **statement head** (`psql-driver.mjs:426-428`).
  - *Measured.* A literal (not computed) `execute 'set names ''SJIS'''` inside a DO body has no lexer finding, and psql's `ENCODING` became SJIS. A0's limit names only "EXECUTE of a **computed** SET".
  - *Remedy.* Either refuse any `set [session|local] names` token sequence wherever it appears, including inside literals and dollar bodies, the way `client_encoding` is matched. Or reword blocker 186, the plan, the README and the comment beside the rule so the limit covers any SET executed through EXECUTE.
- **F7, INFO (disposition wording).**
  - *What.* The disposition's §3 says "the words above are that decision for #165" and "A0 EXECUTED the Owner's decision". Both are A0's reading of a general reply.
  - *Remedy.* Say "on A0's reading of those words" in §3 and in commit `554a9c3`'s carry-over into the handoff. Or have the Owner confirm #165 explicitly.

## §4 Stop-the-line verdict

**No stop-the-line.** Nothing found is a live secret exposure, tenant leak, lost job, migration divergence, irreversible deletion or contract mismatch on the clean set:
- F1's leak and deletion need a later grant;
- F6 needs a later migration or drift written by someone who can already run SQL as the migration role.

**Nothing here blocks the Owner's merge.** CI on `75dae71` is green. The remaining preconditions are the A1 and Q0 role runs, the Integration Owner evidence gap already recorded in the blockers, and the Owner's own decision on #166.

## §5 Limits

- I did not re-run A0's D2–D6, L1–L3, M1–M4 or the twins. Where I rely on them they are **(A0's)**. I measured my own forging check (X11) on one table only, not all 19.
- I did not build any end-to-end exploit of F6. I measured only that the lexer admits the statement and that psql's encoding variable changes.
- My §8 comparison covers role sets in write policies and the shape of SELECT policies. It does not cover every column grant.
- I share the Author's vendor and model family (RFC-2026-024).
- My private artefacts (`cl.sh`, `drift.sh`, `cat.sql` and its output, the drift files, the per-round logs and the clone) are in my private scratchpad directory `c0-127/` and are not in the repository.
