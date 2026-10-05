# C0 contract review: batch 141

- **Package:** `WP-0A-DB-00`. **Role:** independent Reviewer, run `/claude/c0_contract_reviewer`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-141`, head
  `ad97cde0ec9debb3fc73db1c67f6ada902ee97c9` over code `76a26e00836ae68345e91f07073ff197c3770f45`, base
  `e92b896` (main, the merge of PR #182). Author `/claude/a0_atlas`. Draft PR
  <https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/183>.
- **Review branch:** `review/c0-batch-141`, checked out at the subject head `ad97cde`. This file is its only
  commit.
- **Status:** this file records findings. It advances no status, approves nothing and fixes nothing.
- **Inputs read:** `CONTRIBUTING_AGENTS.md`; the plan `a0-batch-141-plan-2026-10-03.md`; the disposition
  `product-owner-disposition-2026-10-03-batch-141.md`; `git diff e92b896..ad97cde` (34 files) and both commit
  messages; `RFC-2026-023` §3-§10 whole; `RFC-2026-026` §3.3-§3.6, §8.1 (head, (a), 2-6), §8.2, §9 and §10;
  `RFC-2026-027` §3.4 (the by-reference amendment format) and Q-027-6; `RFC-2026-020` §6.1; `021_member_scope.sql`
  405-455 (the coverage reading); `140_audit.sql`'s audit CHECKs; the Q0 re-check of batch rfc-023-028 (Q0-RC1);
  the four replacement files; `scripts/db/audit-producer-rule.mjs` (head, the decision function); the `run.mjs`
  diff; the batch 141 section of `isolation-cases.mjs`; the handoff; `open_blockers` at base and head; the
  quoted Owner words in the dispositions for batches 127, 129, 171 and rfc-023-028.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author's run, of the same vendor and model family. Under
RFC-2026-024 that makes this an independent-role run by configuration, not by provenance: I share the
Author's training and blind spots. Acceptance of this file as the C0 role's signature is the Integration
Owner's and the Product Owner's act, not mine.

## 1. Verdict

- **Stop-the-line: no.** Migration 172 implements RFC-2026-023 §3.2 and §8, and RFC-2026-026's command
  half, as the approved texts write them, in every place the questions name:
  - the helpers and their grants;
  - the five-column `app_authz` widening and its policy;
  - the two transitions and their owner and step-up tests;
  - §3.3's producer literal, character for character;
  - the scope copy;
  - the fail-closed placement of the `succeeded` INSERT.

  Two fresh clusters are green on every live layer (§2). Nothing I found reaches a secret, crosses a tenant
  boundary, moves a workspace into a blocked state, edits an integrated migration, or touches a contract-catalog
  file. 172 is declared not applied.
- **Blocks the merge: no**, on my reading. There are two MEDIUM findings, five LOW findings and four notes.
  - **M1** is a measured limit of the new A1 F7 rule. A third command function can reach `app.workspaces`
    through a helper, and the rule stays silent. The plan and handoff describe the rule as *stricter* than the
    RFC. The SECURITY DEFINER pin still forces any such function into a reviewed diff, so this is not
    stop-the-line.
  - **M2** is approved text the batch owes and did not write: Q-023-3's quoted amendment of RFC-2026-020.
  - Both should be fixed, or recorded by name, before the merge. Whether either blocks is the Integration
    Owner's call.
- **CI:** at the time of writing, run 37268147165 ("Bootstrap validation", `bootstrap`, on `ad97cde`) was
  `in_progress`. I make no claim about its result.

## 2. Measured, and how

**Node and branch.** I ran `node -v` before every measured run and got `v24.20.0`
(`/Users/bank/.local/node-v24.20.0/bin` first on PATH; the Homebrew Node 26 was not used).

The handoff guard and `verify` were measured **on the branch NAME**:

1. On `review/c0-batch-141`, `npm run check:handoff` exits 75 by design (`no work package declares
   ownership.branch "review/c0-batch-141"`).
2. The agent branch is checked out in the main worktree. I checked it out here with `git checkout
   --ignore-other-worktrees` at the unchanged ref `ad97cde`, measured, and returned to `review/c0-batch-141`.
3. Afterwards, `agent/claude/WP-0A-DB-00-batch-141` and `origin/agent/claude/WP-0A-DB-00-batch-141` were both
   still `ad97cde`, and `git status` was empty.

| command | exit | result |
|---|---|---|
| `node scripts/verify-branch-scope.mjs e92b896 WP-0A-DB-00` | 0 | `all 34 changed path(s) are declared, and every amendment explains one` |
| `npm run check:handoff` (branch name) | 0 | `describes the branch: nothing substantive after its cited head` |
| `npm run verify` (branch name) | 0 | `clean: exit 0 — tests 688, pass 688, fail 0, skipped 0, todo 0` |
| `make db-schema-lint` / `make db-contract-check` | 0 / 0 | `ok` / `ok` |
| live round r1, port 5505 | 0, 0 | migrate-clean: post-migrate pass `53 apply-time blocks, 37 re-run as written, 16 superseded and replaced`; audit producer rule `decided each of its 19 drifts and controls`; rls-smoke: `1187 isolation case(s) passed`, `db-authz-proofs: ok — 9 claim(s)` |
| live round r2, a fresh cluster | 0, 0 | the same |
| drift d1 (appended to `140_audit.sql`) | 2 | `171_workspace_lifecycle_visibility.sql: after batch 171, app_authz holds 3 policies in schema app; RFC-2026-027 gives it exactly two (P0001)`. This is D1's reason, reproduced. |
| drift i2 (rolled-back transaction on r1's cluster, decided by the rule's own `AUDIT_PRODUCER_READ_SQL` and `decideAuditProducerRule`) | n/a | `no refusal` with the drift present (M1) |
| drift i2 executed (rolled back) | n/a | owner, `aal1`: `app.close_workspace` → `denied step_up_required` (correct); the drift function → `lifecycle_state = closing`, no audit row (M1) |
| §8.1/3, §8.1/5, §8.2/13 probes (rolled back) | n/a | `app_command` UPDATE / DELETE / TRUNCATE on `app.audit_logs`: `42501` ×3; no client role holds UPDATE on `workspaces.lifecycle_state`; EXECUTE on `app.jwt_subject()`: `app_command` and `app_authz` (its owner) (L4) |
| `140_audit.sql` after the drift and at the end | n/a | `cmp` identical to the saved original (sha256 `2ac596bb…c1ad37149`) |
| `gh pr view 182`, `gh run view 37260775313` | n/a | merge commit `e92b896`, `mergedAt 2026-10-05T04:00:41Z`, head `d756052`; run `success` on `d756052`. The disposition's §2 is true. |

**Cluster setup.** PostgreSQL 17.11 from `/opt/homebrew/bin`, `initdb --locale=C -A trust -U postgres`,
`LC_ALL=C`, listening on 127.0.0.1:5505 only with `-c unix_socket_directories=''`. The shim
`db/foundation/ci/supabase-shim.sql` ran first. Each round was re-initdb'd. The private directory was
`scratchpad/c0-141/`. No other port was touched. `try-it` was not run: it refuses 5505 as well
(`RESERVED_PORTS`, `try-it.mjs:63`).

**Read, not measured:**
- the `npm run check` result at `76a26e0` that the code commit message reports;
- the plan's 5507 rounds;
- the try-it part-8 run through `sessionDriver`;
- the platform's `aal` claim, which nobody can measure from here.

## 3. The questions

### 3.1 Is 172 exactly RFC-2026-023 and RFC-2026-026's command half as approved?

**Yes, with M1 and L1–L4 below.** Checked clause by clause:

- **Helpers (RFC-2026-023 §3.2).** `172:110-140`.
  - Same signatures, SECURITY DEFINER, STABLE, `sql`, `search_path ''`, owned by `app_authz`.
  - The membership conjunct is `app.is_active_member(workspace)`, called and not re-derived (Q-023-2).
  - The coverage halves are batch 021's readings, word for word: `021_member_scope.sql:425` for the
    business form and `:448-450` for the page form.
  - Each adds `s.user_id = app.jwt_subject()`, which is right for a definer reading on behalf of the claims.
  - EXECUTE is revoked from PUBLIC and granted to `app_command` (`172:171-176`). `authenticated` is refused, by
    the cases and by 172's check (2).
  - The gate is proven inherited: the authz-proofs "gate" rows, in six blocked states, show the shipped helper
    `false` and 011's join without the conjunct `true`.
- **The `app_authz` widening (§3.2, Q-023-8).** The five columns, with `scope_type` among them, and one policy,
  `using (user_id = app.jwt_subject())` (`172:101-107`).
  - The policy pin, the column pin and pinned-grants.json all moved in the same diff.
  - Both negative controls ran on r1 and r2: policy dropped ⇒ the sibling page is admitted; `scope_type`
    withheld ⇒ `42501` at first call.
- **Step-up (Q-023-5).** `app.jwt_aal()` reads the claims through an `app_authz` helper, and the close refuses
  unless the result is `aal2` (`172:143-151, 266`). It is not measured on the platform, as stated
  (`open_blockers[200]` (2)).
- **Transitions (§8/1, Q-023-7).**
  - The close is active → closing; the cancel is closing → active.
  - Both apply the owner test first, then the step-up test (close only, D2), then the state test (`172:264-273,
    355-362`).
  - The UPDATE re-asserts the source state in its `WHERE`, and a zero-row UPDATE raises inside the block
    (Q0-RC1). Under a race this records `failed` and never `succeeded`.
  - The cancel admits any closing workspace, with no window encoded (§8/5, DATA-DEC-04).
- **Policies (§8/2).** `USING` is the owner test with no lifecycle literal. `WITH CHECK` holds the admitted
  literal on the target state, the owner test and `updated_by = app.jwt_subject()` (D3, `172:193-201`). 171's
  literal check gains this fifth place through the 171#1 replacement (C0-3), held by `171...1.sql:187-194`.
- **Producer literal (RFC-2026-026 §3.3).** `172:204-220` equals the RFC's block token for token. The deparse is
  pinned in `policy-set.json`.
- **Scope copy (§3.6).**
  - The succeeded row's `workspace_id` is the `RETURNING` id; business and page are null (`172:299`).
  - Refusal rows carry the input workspace and no business or page, only under `app.is_active_member`
    (`172:311`), which matches the policy and Q-026-10 (iii).
- **Fail-closed semantics (§3.4).**
  - The succeeded INSERT sits after the `begin … exception … end` block (`172:292-309`).
  - The authz proof shows /7 raising `23514`, /14 raising `42501`, and /16 raising `42501` with no row.
  - /16's control and self-test behave as §8.2/16 asks: the injection admits a `denied` row, and the wrong
    function returns `denied`.
  - A raised error records nothing (no acting user, or missing arguments), which §3.4 accepts.
- **EXECUTE on the commands (§8.1/6).** `authenticated` alone, and the owner's implicit grant is revoked too
  (`172:438-443`). 172's check (2) asks this of every session role.

### 3.2 Is every pin, block and replacement updated legitimately?

**Yes.** Measured: post-migrate 53/37/16, 172's own block green, and each of the four superseded originals
still fails with its recorded `fails_with`, as the runner requires.

- **The two edited replacements** (`011…2.sql`, `021…1.sql`) move the final-state count from 2 to 3.
  - They exclude exactly 172's (table, name) pair from the word-for-word original.
  - 021.1's grant half keeps the original condition and adds a conjunct that still fires on anything beyond
    the five column reads. It then asserts the five are present.
- **The two new replacements** each assert the final state first and whole, then the original with 172's
  additions excluded:
  - `140_audit.1.sql` excepts exactly (`audit_logs`, `audit_logs_insert_command`, `a`, permissive,
    `{app_command}`).
  - `171…1.sql` asserts 3 policies, 11 columns and 6 functions, then 171's checks, then the fifth literal place.
- **Pins and manifest.** `SECURITY_DEFINER_FUNCTIONS` (10 measured), `PINNED_SCHEMA_PRIVILEGES` (the seventh
  rule's `app_command USAGE on app`), `PERMISSIVE_POLICIES`, `AUTHZ_POLICIES` and `AUTHZ_COLUMN_GRANTS_BY_TABLE`
  move in the same diff.
  - The snapshot declares 172 not applied.
  - `open_blockers` grows 200 → 201. `[21]`, `[29]`, `[32]`, `[191]`, `[195]` and `[199]` are pure appends;
    `[200]` is new and last (measured by a script comparing base and head).

### 3.3 Is anything decided here that the RFCs left open, and is it named and recorded?

- **Named and recorded:** D1-D7 in disposition §4, plan §4 and `open_blockers[200]`.
- **Not named:**
  - the Q0-RC1 SELECT policy, which goes beyond the approved §8/2 text (L1);
  - D6, which is a departure from text the RFC wrote rather than an answer to an open question (L2);
  - the stable vocabulary the command introduces (L3).

### 3.4 Are the claims in the commits, plan, disposition, blocker edits and handoff true?

**True where I re-measured them:**
- 1187 cases (1129 + 58);
- 9 proofs (7 + 2);
- 53/37/16;
- 19 drifts and controls;
- 688 tests;
- policy-set 45 rows and 214 keys;
- 34 paths in scope;
- "7 added, 26 modified" for `e92b896..76a26e0`;
- D1's measured exit 2 and its message;
- the #182 merge facts and run 37260775313;
- every Owner quotation, each found verbatim at its cited file.

**Not true as worded:**
- the description of part (i) as "stricter than 'writes'" (M1);
- the claim that the batch "decides nothing new" (L1–L3);
- one status sentence (N2).

## 4. Findings

Grades: MEDIUM means it should be fixed, or recorded by name, before the merge; LOW is a text fix or a limit
to record; a NOTE asks for no change.

### M1 — MEDIUM — Part (i) of the audit producer rule does not hold RFC-2026-023 §8/3 through a call, and is described as stricter than it is

- **Where:** `scripts/db/audit-producer-rule.mjs:203`. The same description appears in
  `handoffs/WP-0A-DB-00-author-handoff.json:148` ("stricter than 'writes'"), `open_blockers[200]` (3) and plan
  §2 row 7.
- **What the rule does:** (i) refuses only a function **owned by `app_command`** whose own body names
  `workspaces`. RFC-2026-023 §8/3 (A1 F7) exists because "the power is the role's, not the function's". The
  UPDATE grant and the `FOR UPDATE TO app_command` policy reach **every** statement executed as `app_command`,
  including a `SECURITY INVOKER` helper owned by another role and called from an `app_command` body.
- **Measured (drift i2, rolled back on 5505):**
  - A `SECURITY INVOKER` `public.c0_lifecycle_helper(uuid)`, owned by the migration owner, runs `update
    app.workspaces set lifecycle_state = 'closing', updated_by = app.jwt_subject() where id = w`.
  - A `SECURITY DEFINER` `app.c0_third_command(uuid)`, owned by `app_command`, does
    `perform public.c0_lifecycle_helper(w)`.
  - The rule's own catalog read and decision function returned **no refusal**.
  - Executed as the workspace owner with `aal1`: the real `app.close_workspace` returned
    `denied workspace.lifecycle.step_up_required`, but the drift function moved the workspace to `closing`
    with **no step-up and no audit row**.
- **Why it is not stop-the-line:** the SECURITY DEFINER probe refuses `app.c0_third_command` until it is pinned
  with its body digest, so such a function arrives only in a reviewed diff. That is the mitigation RFC-2026-023
  §8/3 already called insufficient on its own, which is why it asked for the rule.
- **Remedy (either):**
  - (a) Widen (i). Refuse any function in the rule's scope, whatever its owner or security, whose definition
    names `workspaces` and is not one of `LIFECYCLE_WRITERS`, a pinned `app_authz` helper, or a pinned
    exemption. Add drift i2 as a self-test.
  - (b) If that cannot be made exact, follow §8/3's own fallback: a dedicated owner role for lifecycle
    commands, or record the limit by name on `open_blockers[200]` (3), with A1 as owner and drift i2 cited.
  - Either way, correct "stricter than 'writes'" in the handoff, plan and `[200]` (3): stricter about reads,
    blind to calls.

### M2 — MEDIUM — Q-023-3's answer is half carried out: RFC-2026-020's amendment is not quoted

- **Where:** `architecture/decisions/RFC-2026-023-acting-user-narrowing.md:7` (the Implemented line) and
  `:179` (Q-023-3); plan §5.
- **What was approved:** Q-023-3 was answered as A0 recommended: "By reference in the implementing batch,
  **with the exact sentences quoted in that batch's RFC text**". RFC-2026-023 §5 points at RFC-2026-027's
  precedent, and RFC-2026-027 §3.4 (`:225-266`) gives a "Now: … Becomes: …" for each amended section.
- **What the batch did:** it amends §5/3, §6.1/5, §6.1/6 and §6.3/14 by section number only, in the
  Implemented line and in plan §5.
- **Why it matters:** the edit of RFC-2026-020 is owed to A1 Identity (`[195]` (b)), and without the sentences
  that owner has nothing approved to transcribe. `RFC-2026-023` is within this package's writable paths, so
  the omission is not forced.
- **Remedy:** add the four Now/Becomes quotations to RFC-2026-023, for example as a §5 sub-list or an appended
  implementation note:
  - two policies → three;
  - a third pinned expression;
  - five columns of `workspace_member_scopes` joining the grant, with the "any other table" clause restated;
  - §6.3/14 naming the new policy's control.

### L1 — LOW — The Q0-RC1 SELECT policy goes beyond §8/2's approved text and is not listed among the batch's answers

- **Where:** `172:188-191`; `RFC-2026-023:166` (§8/2: "and **one** policy `FOR UPDATE TO app_command`"); the
  Q0 re-check of rfc-023-028 (Q0-RC1, LOW, "should be folded into §8/2"), which the rfc-023-028 plan assigned
  to "RFC-023's batch".
- **The finding:** the SELECT policy is necessary, and the closing-command proof's "Q0-RC1" row shows it.
  However, RFC-2026-023 was approved without it. This batch adds it but does not fold it into the RFC's text
  or its Implemented line, and does not list it in disposition §4. Plan and disposition still say the batch
  "decides nothing new".
- **Remedy:** name it in the RFC-2026-023 Implemented line (as Q0-RC1's fold) and in disposition §4.

### L2 — LOW — D6 departs from RFC-2026-026's text; it does not answer an open question

- **Where:** RFC-2026-026 §9/1 (`:950`) lists, for the command half, "`grant insert on app.security_events to
  app_command` and §3.7's command policy". §8.1/3 (`:853`) says "`app_command` holds `INSERT` on each audit
  table". Disposition §4 D6 and plan §4 file the omission under "answered as A0 recommends".
- **The finding:** the choice is conservative, since it grants nothing, and RFC-2026-026's Implemented line
  records it. However, it is a deviation from approved text, and the acceptance it needs is A1's (owner of
  batch 140 and of Q-026-9).
- **Remedy:** in D6 and `open_blockers[200]`, call it a deviation from §9/1 and §8.1/3, with A1's acceptance
  owed.

### L3 — LOW — New stable identifiers are introduced without being named as decisions

- **Where:** `172:265-271, 300, 319, 356-360, 389, 408`; `audit-coverage-map.json` (the new row
  `delete.workspace_closing_cancelled`, category `delete`); the fixture.
- **The identifiers:**
  - action names `workspace.lifecycle.close` and `workspace.lifecycle.cancel_closing`;
  - reason keys `audit.workspace.closing_started`, `…closing_cancelled`, `…close_refused` and
    `…cancel_refused`;
  - CTR-ERR-001 codes `workspace.lifecycle.not_permitted`, `…step_up_required`, `…not_active`, `…not_closing`
    and `…write_failed`;
  - the cancel classified in the `delete` audit category, on which D4's before-reference rests.
- **The finding:** once integrated, these become what clients and the audit trail key on. No approved text
  names them, and neither D1–D7 nor `open_blockers[200]` records them as A0's choice. A6's acceptance would be
  needed for the CTR-AUD-001 and CTR-ERR-001 vocabulary.
- **Remedy:** list them as one more D-item, with A6's acceptance owed.

### L4 — LOW — RFC-2026-026 §8.2/13 and §8.1/5, for the command half, are neither executed nor recorded as owed

- **Where:** `RFC-2026-026:891` (§8.2/13: UPDATE, DELETE and TRUNCATE "by either producer: refused") and
  `:861` (§8.1/5, §5.5's pair).
- **The finding:**
  - No batch 141 case covers §8.2/13. The RFC-2026-026 Implemented line rightly omits /13, but nothing records
    it as owed.
  - §8.1/5 has no rule or case naming it.
  - I measured both holding: `42501` ×3 for `app_command`, and no client role holds UPDATE on
    `lifecycle_state`. The `app_worker` UPDATE grant on it predates this batch and is not a client.
  - §8.1/3's "EXECUTE on `app.jwt_subject()` held by `app_command` alone" cannot hold literally, because
    `app_authz` holds it as owner and its helpers need it. The batch does not say so.
- **Remedy:** add the three refusals as cases, and §8.1/5 as an assertion in 172's block or a case, or record
  them on `open_blockers[200]`. Note §8.1/3's owner exception where the RFC is next revised.

### L5 — LOW — The migration sits in another owner's range ahead of that owner's acceptance

- **Where:** `172_…sql:18-25`; disposition §4 D1; `open_blockers[200]` (1).
- **The finding:** the reason is true; drift d1 reproduced exit 2 inside 171's block. Q-027-6 gave batch 170's
  range to RFC-2026-027's migration, not to this one, and CONTRIBUTING_AGENTS.md gives a migration range one
  owner (A1 for 170, by the plan's own words). The decision is named and owed.
- **Remedy:** the Integration Owner's and A1's acceptance of 172 should be recorded at or before the merge,
  not after.

### Notes

- **N1:** the authz proof's "Q0-RC1: SELECT path dropped" row shows a missing policy recorded as the user's
  `denied workspace.lifecycle.not_active`. This does not breach §3.4, which concerns audit-write refusals, but
  an infrastructure defect is reported as a user denial. Worth a sentence where the proof is described.
- **N2:** `service-policy-map.json:139` (the audit_logs row's appended `why`) says the command half "is in
  effect on app.audit_logs". RFC-2026-026's own Implemented line says "in effect when that migration is
  integrated". RFC-2026-026's Status line (`:3`) still reads "NOT in effect until RFC-2026-023 and DATA-DEC-03
  hold", which §9/1 and Q-026-6 now qualify for the command half. Align the wording.
- **N3:** try-it part 8's `proves` text (`try-it.mjs:214`) says "Without step-up the same call is refused and
  recorded as denied", but the tour runs no such step. Either add the step or drop the sentence.
- **N4:** 021.1's widened grant half, like the original, asks `has_any_column_privilege(... 'SELECT')` first, so
  an INSERT or UPDATE column grant without SELECT would pass it. This is not a weakening, and 171.1's check 3
  and the pinned grant probe hold it.

## 5. Stop-the-line

No. None of the stop-the-line classes in CONTRIBUTING_AGENTS.md is present.
- **Secret exposure:** none.
- **Tenant leakage:**
  - Every new path is gated by `app.is_active_member` or the owner test.
  - Every cross-tenant case passes.
  - M1's bypass stays within the caller's own workspace and needs a new pinned SECURITY DEFINER function.
- **Duplicate external side effect, lost job:** none.
- **Migration divergence:** none (172 is declared not applied).
- **Irreversible deletion:** none. `closing` is reversible, and no blocked state is reachable.
- **Contract mismatch:** none, as no contract-catalog file changed. L3 is owed vocabulary, not a mismatch.

## 6. Limits of this review

- **Not measured:**
  - the platform's `aal` claim, or function ownership under a non-superuser applier;
  - try-it (the tool refuses my port);
  - the A1-owned security questions beyond the contract reading (D2, the §4 residual);
  - every one of the 58 new cases one by one: I read the section's helpers and representative cases and relied
    on the runner's counts.
- **Drift i2:** run against the rule's decision function and executed functionally on the live catalog.
  `migrate-clean` was not run with i2 appended, because the SECURITY DEFINER probe would refuse it first, which
  is the mitigation M1 names.
- **CI:** run 37268147165 had not finished when I wrote this.
- **Independence:** same vendor and model family as the Author (§0).
