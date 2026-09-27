# C0 contract review: batch 105, updated_by at UPDATE is the caller (blocker 189)

| | |
|---|---|
| Run | `/claude/c0_contract_reviewer` |
| Role | Independent Reviewer (contract), WP-0A-DB-00 |
| Subject | branch `agent/claude/WP-0A-DB-00-batch-105`, head `4eb118e`, base `5922684` (main, merge of PR #160); Author `/claude/a0_atlas` |
| Date | 2026-09-27 |

This file records findings. It advances no status, approves nothing, and signs nothing on anyone's
behalf. Whether it counts as the Reviewer signature is for the Integration Owner and the Product
Owner to decide.

## §0 What I am

- I am a subagent spawned by `/claude/a0_atlas`, the Author of the work under review.
- I ran in A0's worktree, under A0's brief.
- I am the same vendor and model family as the Author.
- RFC-2026-024 withdrew the cross-vendor condition. That removes one objection. It does not make me
  independent of the brief I was given.
- Accepting this file as the Reviewer signature is an act of the Integration Owner and the Product
  Owner, not mine.

## §1 How I measured

- **Branch name.** The subject branch name is checked out in the main checkout, so I reviewed on a
  local branch `review/c0-batch-105` at `4eb118e`. **Consequence:** the handoff-conformance check
  for "this branch" returns early on an unclaimed branch name, so my green `npm run verify` does
  **not** cover the handoff guard (see F3). `verify-branch-scope.mjs` takes the package as an
  argument and is unaffected.
- **Static (measured):**
  - `npm run verify` exit 0: tests 670, pass 670, fail 0.
  - `node scripts/verify-branch-scope.mjs 5922684 WP-0A-DB-00` exit 0: "all 17 changed path(s) are
    declared, and every amendment explains one".
  - `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-DB-00.json` exit 0.
  - `git diff 5922684 4eb118e --stat -- db/foundation/migrations`: one file added, none modified.
    No integrated migration was rewritten.
- **Live (measured):** a private cluster in `scratchpad/c0-105/`, `127.0.0.1:5505`, TCP only
  (`unix_socket_directories=''`), `initdb --locale=C -A trust -U postgres`, `LC_ALL=C`, PostgreSQL
  17.11 (Homebrew). Shim applied first. Fresh initdb for each round. `:5432` and `:5499` were not
  touched. The cluster was stopped and removed afterwards.
  - **Round 1 (clean head):** `make db-migrate-clean` ok. The closure text probe reports "14
    updated_by INSERT, 7 updated_by UPDATE and 2 requester closures ... (self-test: refused its
    drift)". The post-migrate pass reports "43 apply-time blocks, 33 re-run as written, 10
    superseded and replaced". `make db-rls-smoke` ok: "972 isolation case(s) passed". Probes
    P1–P12 below ran on this database, each in a transaction that was rolled back.
  - **Round 2 (negative control):** seven `drop policy <t>_updated_by_on_update_is_caller` appended
    to `140_audit.sql`. `migrate-clean` FAILED by name in the closure text probe ("app.business_profiles
    has no business_profiles_updated_by_on_update_is_caller, ..."). 105's block, run by hand on
    that database, raised "batch 105 finds 0 of its seven updated_by UPDATE closures". `rls-smoke`
    FAILED "7 of 972". The seven were exactly the seven new `owner-a-cannot-update-...-naming-another-updater`
    cases, each "1 row(s) came back. The operation was permitted." `140_audit.sql` was restored and
    checked byte for byte with `shasum -a 256 -c`: `2ac596bb…c1ad37149` OK. The tree was clean.

## §2 Answers to the brief's questions

### Q1. Does 105 match the Owner's remedy (a) and the plan? Yes (read and measured)

- The disposition records the Owner's `ก` to remedy (a). 105 (`105_updated_by_on_update_is_caller.sql:31-51`)
  creates seven RESTRICTIVE `FOR UPDATE TO authenticated` policies with no USING and
  `WITH CHECK (updated_by = (select auth.uid()))`. That is A1 F1's remedy 1, second form. Measured
  in the catalog: `polpermissive = f`, `polcmd = 'w'`, `polqual` null, roles `{authenticated}`, and
  the pinned deparse text.
- A1's remedy 2 (the probe pins the UPDATE closures by text) is done (`scripts/db/run.mjs:163-166, 195`).
  Remedy 3 (a forging case per table) is done (`isolation-cases.mjs`, the seven BATCH 105 cases).
  Remedy 4 (correct 102:6) is answered in 105's header (`:10-12`), because migration invariant 1
  forbids an in-place edit. Remedy 5 (the blocker wording) is answered by the reworded
  PARTLY-DISCHARGED blocker and the removal of 189.
- The plan's six batch items (`a0-batch-105-plan-2026-09-27.md` §3) are all present in `4eb118e`.

### Q2. Is the policy correct? Yes, with one overstated claim (F1)

- **Restrictive, no USING, equality.** All confirmed in the catalog (measured). P4: the owner
  setting `updated_by = null` on `app.workspaces` is refused by
  `workspaces_updated_by_on_update_is_caller`. So equality, not `is null or =`, holds live.
- **The 17, re-measured.** 17 `app` tables grant `authenticated` UPDATE on `updated_by`. No
  partitioned table or other relkind carries the column. `anon` holds no such UPDATE. For the ten
  bound tables I counted every PERMISSIVE UPDATE/ALL policy for `authenticated`: 11 policies, and
  all 11 contain `(updated_by = ( SELECT auth.uid() AS uid))` ANDed with the role test. No
  `is null or`, no bare OR. The other seven now carry 105's restrictive closure. **No table of the
  17 is still open on the clean set** (measured).
- **Other roles.** `app_worker` holds UPDATE on `updated_by` on six of the seven tables. 105 is
  `TO authenticated`, so `app_worker` is unaffected. That is correct for the brief, and the service
  paths are governed by the existing `*_service_path_closed` policies. `service_role` and `anon`
  hold nothing here (measured).
- **Legitimate paths.**
  - No function in `app`, `private` or `auth` updates any of the seven tables. The five SECURITY
    DEFINER functions are three `app_authz` readers plus `set_updated_at` and `refuse_mutation`
    (measured).
  - Every FK is NO ACTION, so no referential action writes these rows (the fk action probe, "0
    exempt").
  - No repository code outside the migrations and tests issues an UPDATE on them (`git grep`).
  - P1: the owner renaming workspace A while naming themself works, `UPDATE 1`.
  - P5: the owner updating `workspace_settings` and `workspace_invitations` while naming themself
    works, `UPDATE 1` each.
  - The intended behaviour change is real: any client UPDATE on the seven that leaves `updated_by`
    at another member's id, or at NULL, is now refused. The migration header (`:20-22`) and the
    handoff's `compatibility_impact` say so.
- **Other identities (measured).** P6: an admin forging on `business_profiles` is refused by 105's
  policy. P7: a scoped editor forging on `knowledge_items` is refused by 105's policy. That covers
  A1's inferred scoped-editor variant.

### Q3. Replacement edits. Additive, marked, strict, `fails_with` correct (read, measured by the guard)

- `030_industry.1.sql` and `040_knowledge.1.sql` only add the new name to the pinned restrictive
  set, the exclusion lists and the header. Each changed line carries `SUPERSEDED BY 105`. The pins
  stay exact-array (`is distinct from array[...]`), so a fifth restrictive policy still fails.
- `superseded.json`: `fails_with` moved to "carries 4 restrictive policies" (030) and "wrote 6
  restrictive policies" (040). Guard (2) requires each original block to still fail with exactly
  that prefix. Round 1's green `migrate-clean` therefore measured both counts true.
- A cosmetic leftover is recorded in F6.

### Q4. The changed cases and the seven new ones

- **The seven new cases fail for the right reason (measured).** Each forges ONLY `updated_by` as
  the owner, whom the permissive policy and the other restrictive policies admit, so 105 is the only
  thing that can refuse the row. In Round 2, without 105, exactly these seven failed with "1 row(s)
  came back", and nothing else failed. That is a clean negative control.
- **The two inline editor positives** (`isolation-cases.mjs:4611-4616`, `:4685-4690`) now set
  `updated_by = __SELF__` and still assert the `why` (the editor `P` reaches its in-scope write
  path). The Author's measurement that they fail on 105 without naming the caller is **read, not
  re-measured**.
- **`renameKnowledge`** (`:2595-2603`) changes the SQL of eight cases: 2 positives and 6
  negatives, 5 of them `no-effect` plus the service case. The negatives are not weakened: USING
  filters before WITH CHECK is read, and naming the caller leaves the original policy as the only
  possible refuser. All eight still assert their `why` (measured green). The count wording is
  recorded in F5.
- **`service-cannot-update-a-knowledge-item`** (`:5780-5790`) now passes `id('user_owner_a')`. Its
  `why` says the service HOLDS the grant and is filtered by RLS. That is still true (measured:
  `app_worker` holds UPDATE on `knowledge_items.updated_by`, and the case is `no-effect`). The
  helper comment that explains it is wrong (F2).

### Q5. Are the claims true? Mostly. Removing 189 is justified. The grade's authority is stated honestly

- **True (measured):**
  - 17 / 10 / 7, and the seven named;
  - "43 blocks";
  - "972 cases";
  - "Without 105, exactly those seven fail";
  - tests 670;
  - floors 70 / 318, since the coverage-floor guard inside `npm run verify` passed;
  - blocker count 188.
- **Overstated:** "no table may let authenticated UPDATE updated_by unless an UPDATE policy binds
  it to the caller" (F1).
- **Removing 189 is justified.** The blocker listed as owed a forward fix per table, the closure
  probe extended, and a forging case per table. All three are delivered, and I measured each. The
  plan says "closed on merge" (§3.6) while the commit removes it on the branch. Removal only takes
  effect when the branch merges, so the two are equivalent (INFO).
- **Grade.** MEDIUM is A1's grade, and A0 recommended it. The disposition (§2) says plainly that
  the Owner answered `ก` and did not state the grade separately. That is honest. A1's note that the
  Owner "may reasonably read it as LOW" is not repeated in the disposition, but the disposition
  does not claim otherwise.

### Q6. Ownership, floors, branch scope. Clean (measured)

- The branch-scope verifier, the role-separation validator and `npm run verify` all exit 0.
- The four amended-without-owning paths each carry a rationale.

### Q7. Stop-the-line? None

- 105 only narrows. It adds seven restrictive policies and changes no grant, role or existing
  policy.
- No tenant boundary is touched. No secret is involved. No integrated migration is rewritten.
- Numbering 105 inside the range it fixes follows the 102–104 precedent, and it is declared in the
  snapshot tail and the not-on-instance list.

## §3 Findings

### F1: LOW. 105's "general rule" checks that a token is present, not that the caller is bound; a later drift reopens the class on the ten and passes both 105's block and the probe (measured)

- **What.** `105_updated_by_on_update_is_caller.sql:86-90` passes a table if **any** UPDATE/ALL
  policy for `authenticated` has a WITH CHECK whose text *contains*
  `(updated_by = ( SELECT auth.uid() AS uid))`.
- **Where the claim is stated.** The commit body, plan §3.1 ("no table may let authenticated
  UPDATE `updated_by` unless an UPDATE policy binds it to the caller"), `db/foundation/README.md:336-337`
  and the raise text at `:92` all claim that binding. The in-file comment at `:77-79` states the
  real test accurately ("has a WITH CHECK containing").
- **Measured on Round 1's database, as a drift in a rolled-back transaction:**
  - **P9.** Add a second permissive `FOR UPDATE TO authenticated USING (true) WITH CHECK (true)`
    policy on `app.assets`. Both 105's block and the closure text probe return `DO`. The owner then
    writes the editor as `updated_by`: `UPDATE 1`, and the forged value comes back.
  - **P10.** Alter `assets_update_writer`'s WITH CHECK to `((updated_by = auth.uid()) OR true) AND <role>`.
    Both checks pass again, and the forgery again returns `UPDATE 1`.
  - On the seven tables this cannot happen, because 105's closure is restrictive and pinned by
    text:
    - P11: gutting it is caught by 105's block ("6 of its seven").
    - P11b: gutting it is also caught by the probe, which names
      `workspaces.workspaces_updated_by_on_update_is_caller`.
    - P12: a closure name on an unpinned table is caught by the probe.
- **Impact.** Nothing is open on the clean set (Q2). This is a later drift that the "class cannot
  reopen" criterion in the handoff says is prevented, and on the ten tables it is not.
  `run.mjs:156-158` itself records that "`... or true` keeps the tokens". A1 says rls-smoke has
  UPDATE forging cases for some of the ten. I did not verify which.
- **Why LOW.** The rule is strictly stricter than what existed before (nothing). It would catch a
  newly created table that forgets the binding altogether. The harm needs a later migration.
- **Recommendation, not a decision.** Any of these would do: reword the claim to what is checked;
  or require that EVERY permissive UPDATE policy for `authenticated` on a table carries the token;
  or pin the ten tables' UPDATE WITH CHECK by text, as the seven are. Only the text pin closes
  `OR true`.

### F2: LOW. The `renameKnowledge` comment says the service's refusal is the privilege system's; it is row level security (measured)

- **What.** `tests/db/identity/isolation-cases.mjs:2598-2599` says: "An identity with no JWT
  subject (the service) passes one explicitly: its refusal is the privilege system's, before any
  value of updated_by is read."
- **Measured:** `has_column_privilege('app_worker', app.knowledge_items.updated_by, 'UPDATE')` is
  true. The case's own `why` (`:5786`) says the service "HOLDS the UPDATE grant ... and is filtered
  there", and it expects `no-effect`, which is a row level security outcome.
- **Impact.** The comment is false. The case itself is correct. A reader who trusts the comment
  would expect a grant-layer 42501 and could "fix" the case toward it.

### F3: LOW. The handoff at `4eb118e` cites an empty range and lists no changed files (read)

- **What.** `handoffs/WP-0A-DB-00-author-handoff.json:7-11` has `base_revision` equal to
  `head_revision_or_patch_checksum` (`5922684`), with `files_added: []` and `files_modified: []`.
  The `npm run verify` entry reads "see the commit" (`:41`), and the commit body gives no `verify`
  exit or count.
- **Why it matters.** `CONTRIBUTING_AGENTS.md` ("Work and evidence flow") requires a handoff to list
  changed files, tests and exit codes. The conformance test diffs the cited range, so an empty range
  passes it vacuously. My run cannot exercise the branch guard (§1).
- **Context.** The previous branch followed the same pattern with a follow-up "the handoff cites
  this branch" commit (`b440a01`). This finding is that the refresh is still owed before merge. It
  is not a claim that the pattern is wrong.

### F4: LOW. No rls-smoke positive shows an honest UPDATE still succeeds on `workspaces`, `workspace_settings` or `workspace_invitations` (measured live, not in the suite)

- **What.** The handoff's criterion "Honest updates still work" cites the four editor positives,
  which cover `business_profiles`, `page_context_profiles` and `knowledge_items`. The suite has no
  `expect: 'rows'` UPDATE case on the three identity tables, which I enumerated from `buildCases`.
  That gap predates 105, but 105 now changes those three paths.
- **Measured:** P1 and P5 succeed. An over-refusing closure on those three tables would today be
  caught only by the text pin, not by behaviour.

### F5: INFO. "Four cases changed" understates the case edits

- The commit and handoff say four positives changed. Through `renameKnowledge`, the SQL of eight
  knowledge cases changed (2 positives, 6 negatives), plus the two inline positives.
- None is weakened (Q4). The count should say so.

### F6: INFO. Two comments did not follow the additive edits

- `db/foundation/invariants/030_industry.1.sql:109-110` still reads "both restrictive and both
  asserted" and "a fourth restrictive policy still fails here". There are now three later policies,
  and the failing case is a fifth.
- `isolation-cases.mjs:2596-2597` says a rename that leaves `updated_by` alone is refused "wherever
  the row's last updater was somebody else". It is also refused where `updated_by` is NULL
  (measured, P4 analogue on `workspaces`).

### F7: INFO. The probe's self-test covers only the INSERT half; the pin test pins only the general rule's message

- `CATALOG_RULE_PROBES`' closure drift (`run.mjs:315`) exercises the INSERT closures only. The new
  UPDATE rule has no drift of its own. I measured its three failure modes by hand: missing (Round
  2), gutted (P11b) and misplaced (P12).
- `foundation-contract.test.mjs:2160-2171` pins the seven policies' text, but for the general rule
  it pins only the two raise strings, not its SQL. A weakened rule body with the same messages
  passes the static test.

## §4 Limits

- Same-vendor subagent under the Author's brief (§0).
- Stock PostgreSQL 17.11 with the CI shim, not Supabase.
- I did not re-measure the Author's claim that the four positives fail on 105 without naming the
  caller.
- P9 and P10 were measured on `assets` only. I did not check which of the ten tables rls-smoke
  covers with an UPDATE forging case.
- I did not run the full Tester surface (floors, digests and the integrity manifest were checked
  only through `npm run verify`).
- I reviewed on `review/c0-batch-105`, not the subject branch name, so the handoff guard was not
  exercised.
- Probes P1–P12 are ad hoc SQL in my private scratchpad. They are not repository tests, and they
  are described here rather than committed.
