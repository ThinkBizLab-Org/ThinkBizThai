# C0 re-verification: batch 123's corrections (`f429fe6`, handoff `f2c1a54`)

| | |
|---|---|
| Run | `/claude/c0_contract_reviewer` |
| Role | Independent Reviewer (contract), WP-0A-DB-00 |
| Subject | branch `agent/claude/WP-0A-DB-00-batch-123`: the corrections commit `f429fe6` and the handoff commit `f2c1a54`, on top of `8ba29d0`; base `e276c9a` (main, merge of PR #161); Author `/claude/a0_atlas` |
| Why | RFC-2026-025 §5 item 2 (approved 2026-09-28): a commit added after the role runs, answering their findings, that touches a migration, scripts and cases, is re-verified by all required role runs before merge |
| Earlier reviews | mine of `5856f0b` (`c0-batch-123-contract-review-2026-09-28.md`), Q0's (`q0-batch-123-test-review-2026-09-28.md`), A1's (`a1-batch-123-security-review-2026-09-28.md`); A0's integration record (`a0-batch-123-integration-2026-09-28.md`) |
| Date | 2026-09-28 |

This file records findings. It advances no status, approves nothing, and signs nothing on anyone's
behalf. Whether it counts as the Reviewer's re-verification is for the Integration Owner and the
Product Owner to decide.

## §0 What I am

- I am a subagent spawned by `/claude/a0_atlas`, the Author of the work under review.
- I ran in A0's worktree, under A0's brief. The brief's list of what changed was a list to check, and
  I checked it against the diff rather than relying on it.
- I am the same vendor and model family as the Author.
- RFC-2026-024 withdrew the cross-vendor condition. That removes one objection. It does not make me
  independent of the brief I was given.
- Accepting this file as the Reviewer's signature is an act of the Integration Owner and the Product
  Owner, not mine.

## §1 How I measured

"Measured" means I ran it. "Read" means I read the file or record and executed nothing.

- **Checkout.** The subject branch is checked out in the main checkout, so I checked out `f2c1a54`
  in my worktree as `review/c0-batch-123-fix`. This file is committed there, and nothing else is.
- **Diff.** I read `git diff 8ba29d0 f2c1a54` in full (24 files, +664/−131). `f2c1a54` changes only
  the handoff: its head becomes `f429fe6`, and it adds three paths to the file lists.
- **Branch name.** An unclaimed branch name makes the handoff guard return early. I cloned the
  worktree into my private directory (`scratchpad/c0-123f/clone`), put
  `agent/claude/WP-0A-DB-00-batch-123` at `f2c1a54` there, and set `main` to `e276c9a`. `git
  ls-remote origin` shows GitHub's `main` at `e276c9a` and the subject branch at `f2c1a54`.
- **Toolchain.** `node -v` 24.20.0, npm 11.19.0, `.node-version` 24.20.0. PostgreSQL 17.11 (Homebrew).
- **CI (measured through `gh`).** Draft PR #162 is open with head `f2c1a54`. Run `36387036665`
  (`pull_request`, "Bootstrap validation") succeeded on that head, including its "Database
  foundation" and "Negative control" steps. The record's §4 says CI had not been observed. That was
  true when it was written.

**Static checks (measured):**

| Command | Where | Result |
|---|---|---|
| `npm run verify` | `review/c0-batch-123-fix` | exit 0, tests 672, pass 672, fail 0 |
| `npm run verify` | the branch name, in the clone | exit 0, tests 672, pass 672, fail 0 |
| `node --test test-kits/handoff-conformance.test.mjs` | the branch name | 19/19, including "the handoff for this branch describes this branch" |
| `node scripts/verify-branch-scope.mjs e276c9a WP-0A-DB-00` | the branch name | exit 0, "all 31 changed path(s) are declared, and every amendment explains one" |
| `node scripts/verify-test-coverage-floor.mjs` | the branch name | exit 0 |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-DB-00.json` | the branch name | exit 0 |
| `npm run scan:secrets` | the branch name | exit 0 |
| `git diff --name-status e276c9a f2c1a54 -- db/foundation/migrations/` | worktree | `A 123_…` only. 123 is not on `main`, so editing it in `f429fe6` rewrites no integrated migration |
| handoff file lists against `git diff --name-status e276c9a f429fe6` | worktree | identical |

**Live database (measured).**

- **Setup.** A private cluster in `scratchpad/c0-123f/`, on `127.0.0.1:5505`, TCP only
  (`unix_socket_directories=''`). Created with `initdb --locale=C -A trust -U postgres`, run with
  `LC_ALL=C`. The shim went first. Every round started from a fresh initdb.
- **Drifts.** Each was APPENDED to the clone's `140_audit.sql`, which was restored after every round.
  Its sha256 was checked each time (`2ac596bb950e8dfb…`, unchanged).
- **Runner mutations.** J1–J9 edited the clone's `scripts/db/run.mjs`. It was restored after each,
  and its sha256 checked (`232ab5bee09f9de1…`, unchanged).
- **End state.** `git status` in the clone was clean at `f2c1a54`. `:5432` and `:5499` were not
  touched. The cluster was stopped and removed, and nothing listens on `:5505`.

**Round 0, the clean head.** `make db-migrate-clean` exit 0, then `make db-rls-smoke` exit 0.

- **Nine catalog-rule probes, each with its self-test claim.** The drifts per probe are
  1+1+1+1+1+1+1+2+4, and the FK-action claim reads "0 exempt by name".
- **Post-migrate pass.** "44 apply-time blocks, 34 re-run as written, 10 superseded and replaced."
- **Isolation cases.** "986 isolation case(s) passed."
- **State left afterwards.** `pg_db_role_setting` is empty. The append-only tables have no child or
  parent, and `app.probe_child_of_security_events` does not exist. `private.set_updated_at()` is
  still SECURITY DEFINER.
- **The new objects.** The decider closure is `cmd=w`, `{authenticated}`, with no USING and WITH
  CHECK `((decided_by IS NULL) OR (decided_by = ( SELECT auth.uid() AS uid)))`. Both CHECKs are
  validated and in their pinned text.
- **Who can write `decided_by`.** `app.approval_requests` is the only relation where
  `authenticated` holds UPDATE on it. Of the client-updatable `*_by` columns in `app`, `decided_by`
  and `updated_by` are each named by a restrictive policy.

**Database drifts (measured).** In this table, "(1)" means exactly that one case failed, and "(2)"
means exactly those two cases failed.

| Round | Drift appended to 140 | migrate-clean | rls-smoke |
|---|---|---|---|
| N1 | drop `approval_requests_decider_is_a_pair` | exit 2, pinned check probe names the pair | 2 of 986: `…-naming-a-decider`, `…-with-only-a-decided-at` |
| N2 | drop 090's `approval_requests_decision_has_a_decider` | exit 2, pinned check probe names it; its self-test drift then errors 42704 and is reported too | 1 of 986: `…-with-a-whole-decision-stamp` |
| N3 | Q0's E19b: the decide policy loses `decided_by = (select auth.uid())` | exit 0 | 986 of 986 (the closure holds; see M-table E19r) |
| N4 | E19b and the decider closure dropped | exit 2, decider closure probe names the missing closure | 2 of 986: `editor-…-naming-another-decider` (got 23514), `approver-a-cannot-decide-…-naming-another-decider` (1 row) |
| N5 | decider closure dropped alone | exit 2, decider closure probe | 1 of 986: `editor-…-naming-another-decider` (23514, not an RLS refusal) |
| N6 | on each of the five tables Q0 F5 named: 123's closure dropped and `c0_open` (`using (true) with check (true)`) added | exit 2, updated_by update closure probe | 21 of 986: **all five new forging cases**, plus 16 role cases that the open policy widens |
| N6b | `content_items` only: closure dropped, and a sibling that keeps the writer roles and loses only the actor binding (Q0's E02c shape) | exit 2, updated_by update closure probe | **1 of 986: `editor-a-cannot-rename-the-content-item-of-a1-naming-another-updater`** |
| N7 | Q0's E08: the pair replaced under its own name by `decided_by is null or decided_at is not null` | exit 2, pinned check probe (by text) | 1 of 986: `…-with-only-a-decided-at` |
| N8 | Q0's E20b: 090's rule replaced under its own name by "a decision needs both", added NOT VALID | exit 2, pinned check probe | 1 of 986: `…-with-a-whole-decision-stamp` |
| N9 | `or true` appended to the decider closure's WITH CHECK | exit 2, decider closure probe (by text) | 1 of 986: `editor-…-naming-another-decider` |
| N10 | a new table with an FK to `workspaces` and no supporting index | exit 2, FK-support probe names it | 986 of 986 |
| N2b, N9b | N2 and N9 again, then 123's own `do $$` block fed by hand in a rolled-back transaction | – | 123's block raised "batch 090's approval_requests_decision_has_a_decider, which batch 123's pair completes, is missing…" (N2b) and "batch 123's approval_requests_decided_by_on_update_is_caller is missing or not in its required shape" (N9b) |

**Runner mutations to the clone's `run.mjs` (measured).** Each ran a fresh migrate-clean and rls-smoke,
then `node --test test-kits/db/foundation-contract.test.mjs`.

| # | Mutation | migrate-clean | static foundation-contract |
|---|---|---|---|
| J1 | the coverage rule silenced with `and false`. This is my D7 on `5856f0b`, which then **passed** migrate-clean | **exit 2**: "closure coverage probe: its self-test after drift 1 passed …" | exit 1, digest |
| J2 | the trigger probe's session_replication_role rule silenced | exit 2: "trigger probe: its self-test after drift 3 passed" | exit 1, digest |
| J3 | the security definer probe's second rule silenced | exit 2: "security definer probe: its self-test after drift 2 passed" | exit 1, digest |
| J6 | the updated_by UPDATE closure rule silenced alone | exit 2: "updated_by update closure probe: its self-test after drift 1 passed" | exit 1, digest |
| J4 | the trigger probe's fourth self-test removed (4 raises, 3 drifts) | **exit 0** (the live verdict does not count raises) | exit 1: "trigger probe: 4 rule(s) and 3 self-test(s)" |
| J5 | the pinned check probe given `selfTests: []` | exit 2: "pinned check probe: carries no self-test drift" | exit 1: "1 rule(s) and 0 self-test(s)" |
| J7 | the trigger probe's second prefix set to `''` | not run: `''` prefixes every message | exit 1, **digest only**; the drifts-equal-raises assertion passes |
| J8 | one FK-action exemption added (`app.content_items.content_items_business_scope_fk`) | exit 0: "1 exempt by name (self-test: refused each of its 2 drifts)" | exit 1, digest only; drifts equal raises, 2 and 2 |
| J9 + N10 | the **FK-support** probe's first rule silenced, over a live unindexed FK | exit 2, but the FK-support probe **prints its claim** ("every foreign key … has a supporting index"); only the post-migrate re-run of `104_fk_supporting_indexes.sql#1` names the key | **exit 0** |

**Rolled-back statements on the round-0 database (measured).** Here `owner` is owner_a, `approver`
is approver_a and `editor` is editor_a, all from the fixture catalog. "Pending" is
`approval_request_a1`, and "decided" is `approval_request_a1_decided` (approved, decider owner_a).

| # | Statement | Result |
|---|---|---|
| M3r | a looser permissive sibling (`using (true) with check (true)`); the owner approves "pending" naming the approver as decider. This is my F6 on `5856f0b`, which then returned UPDATE 1 | ERROR, violates `approval_requests_decided_by_on_update_is_caller` |
| M3c | as M3r, with the decider closure dropped in the transaction (the control) | 1 row |
| L3r, L4r, L5r | Q0's L3–L5 under the looser sibling: the editor approves naming the approver; the approver approves naming the owner; the approver re-stamps "decided" naming the owner | each ERROR, the decider closure |
| L6r | Q0's L6: `or true` on the decide policy; the approver approves naming the owner | ERROR, the decider closure |
| E19r | Q0's E19b in the transaction; the approver approves naming the owner | ERROR, the decider closure |
| **L5s** | the looser sibling; the approver re-decides "decided" **in its own name**, approved → changes_requested | **1 row**: `changes_requested`, `decided_by` = the approver (F2) |
| P1, P2, P3 | clean set: the approver approves naming itself; the owner cancels plainly; the owner sends back naming itself | 1 row each |
| O1 | clean set: the editor cancels naming the approver (the new `denied` case) | ERROR, the decider closure. Row level security's WITH CHECK runs before the CHECK |
| O2 | clean set: the editor cancels naming itself (the changed pre-existing case) | ERROR, violates `approval_requests_decider_is_a_pair` |
| SRV | superuser cancels naming the approver | ERROR, the pair (it binds every writer) |
| SRV2 | superuser approves naming the approver | 1 row. By design: the closure is `TO authenticated`, and a service identity is RFC-2026-023's question |
| X1 | a candidate remedy for F2: restrictive `for update to authenticated using (status = 'pending')` with no WITH CHECK | rls-smoke 7 of 986 fail: every cancel and decide positive, because PostgreSQL reuses USING as the WITH CHECK |
| X1b | the same with `with check (true)` | rls-smoke **986 of 986**. migrate-clean fails only on 090's exact restrictive set, as it would for any new restrictive policy. L5s: **0 rows** |

**Counts (measured).**

- **Floors.** The guard's own count for `foundation-contract.test.mjs` is 71 tests and 342
  assertions, the same as its floors. For `identity-isolation.test.mjs` it is 302 tests and 2141
  assertions, the same as its floors.
- **Forging cases.** Every one of the seventeen tables has at least one client-identity case that
  UPDATEs it with `updated_by` naming someone other than the caller and expects a refusal (read from
  `buildCases`).
- **Drifts and raises.** Every probe has as many drifts as raises. Each prefix is non-empty and
  begins exactly one raise in its probe. No probe uses another raise form.

## §2 Answers to the brief's questions

### Q1. Does each row of the record's §2 do what it says, and does §3 honestly list what was not acted on?

**§2: yes, every row, measured.** In the table, "record" means the integration record.

| Record §2 row | What it says | Verdict |
|---|---|---|
| Q0 F2 | the decider closure is asserted in 123's block and pinned in a new probe, and refuses nothing that works today. E19b alone: 986 pass. E19b and a dropped closure: the two naming-another-decider cases fail. The closure dropped alone: `…-naming-another-decider` fails (23514, not 42501) | TRUE (N3, N4, N5, N9b; P1–P3; M3r, L3r–L6r, E19r) |
| Q0 F1 | 090's equivalence is asserted by text in 123's block and pinned in a probe; a new whole-stamp case. 090's dropped: exactly that case fails | TRUE (N2, N2b, N8) |
| Q0 F3 / C0 F5 | one drift per rule; the static test holds drifts equal to raises; the probe is split; five further rules closed; a probe with no self-test fails the verdict; nine probes, 1+1+1+1+1+1+1+2+4; role settings empty and no child left behind | TRUE (round 0; J1–J6, J8). The static test's reach is F5 |
| Q0 F4 | `violates`; the runner checks the name; the static test covers a match, a mismatch, a longer name and an accepted row; the pair tested both ways. The pair dropped: exactly the two pair cases fail | TRUE (N1, N7; read `run-isolation.mjs:229-240`, `identity-isolation.test.mjs:235-251`) |
| Q0 F5 | five cases, each the passing statement of a positive with only the actor changed; all seventeen tables now covered; per table, the case fails without the closure | TRUE (N6, N6b; read: each mirrors `editor-a-can-rename-the-content-item-of-a1`, `owner-a-can-toggle-an-approval-policy`, `owner-a-can-cancel-an-approval-request`, `owner-a-allows-paid-ads-on-an-asset-rights`, `owner-a-can-cancel-a-publish-intent`) |
| C0 F7 | the stale raise messages name 123; 090's `fails_with` is now 12 | TRUE. All ten messages my F7 listed are updated (read), and round 0's post-migrate pass proves the ten register entries |
| C0 F9 | the caveat is added | TRUE (`session-2026-09-28-ninth-pass.md:15`) |
| C0 F1–F4, A1 F8–F9 | RFC-2026-025 §5 covers six things | TRUE as a list of §5's items. What §5 left out of A1's recommendations is F1 below |
| C0 §4 item 1 | the self-granted clause is removed | TRUE (RFC `:3`; the disposition's "A correction" paragraph). The status line has a stale word (F3) |
| A1 F7 | the fixed count is gone; the probe's pinned list keeps it | TRUE (`123_…sql:125-128`; the round-0 claim "17 updated_by UPDATE closures"). Removing the count loses nothing: the probe's closure rule already refuses a closure-named policy on an unlisted table |

**§3: incomplete** (F1). It lists what the record acted on in part. It omits these recommendations,
none of which is adopted:

- A1 F8(d);
- A1 F9(d) in part, F9(f) in part, and F9(g);
- A1 F3's remedy 2, a coverage rule for every client-updatable `*_by` column;
- A1 F6's README wording.

**Claims of fact elsewhere (read or measured):**

| Claim (where) | Verdict |
|---|---|
| "Nine cases … rls-smoke 977 -> 986" (commit) | TRUE: nine new ids (four decider or pair cases, five updated_by cases) and 986 measured. One pre-existing case also changed, and the commit does not say so (F8) |
| "Negative controls …: each new refusal, removed, fails exactly its own case(s)" (commit) | TRUE (N1, N2, N5, N6b, N7, N8, N9) |
| "the 090 register entry (11 -> 12)" (commit); 44/34/10 (record) | TRUE (round 0) |
| "floors to the guard's numbers" (commit, `test-suite-contract.mjs`) | TRUE, measured equal. "Its corrections renamed two and added none" is true: two test names changed and the count stayed at 71 |
| README `:323` "four families of rules … in nine probes"; `:362-367` "Every rule is shown able to fail on every run … six more" | TRUE for the catalog-rule probes. "Six more" and the record's "five more" count the same eight rules (Q0's two, plus the requester rule, plus five), so they agree. The FK-support probe, named in the same section's first sentence, has no self-test (F6) |
| README `:337` "A table that grants UPDATE on `updated_by` without the closure fails twice" | Still says "a table". A1 F6 asked for "an `app` table" (F1) |
| Blocker 186 (`WP-0A-DB-00.json`, 188 blockers): "each of the seventeen tables has an rls-smoke case forging updated_by at UPDATE" | TRUE (read from `buildCases`) |
| Blocker 186: "decided_at … 2001 and 2999" and later "2000-01-01 and 2999-01-01" | Both TRUE. They are A1's and Q0's dates respectively |
| Handoff: head `f429fe6`, file lists, four acceptance rows, three tests rows | TRUE (lists compared). `tests[0].result` says "see the commit", and the commit does not state the verify count. `VERIFICATION.md` does: 672 |
| Handoff: "eleven policies and one CHECK" | TRUE (read; the static pin test asserts eleven) |
| RFC §5 item 3: "This package has no r0 evidence file, and that is recorded as a gap" | HALF TRUE. No r0 file exists. Nothing but that sentence records the gap (F4) |
| Disposition (rfc-025) §5: "Its items 5–6 are A1's" | TRUE of their origin. Not all of A1's F8 and F9 are in them (F1) |

### Q2. My F1–F10 and §4 item 1: answered as the record says?

| Mine on `5856f0b` | Answer at `f2c1a54` | Verdict |
|---|---|---|
| F1 MEDIUM, record-only loopholes | §5 item 1 narrows the class and excludes dispositions, role files, blocker edits and other manifest fields; item 5 asks for a mechanical check; "Until item 5's mechanical check exists, no PR is treated as record-only" (RFC `:69-70`) | ANSWERED, and in the safe direction. The narrowed class holds no slot-moving PR (F7) |
| F2 MEDIUM, fix commits merge unreviewed | §5 item 2 (RFC `:84-91`); this run is its application | ANSWERED |
| F3 MEDIUM, §3 incomplete, Integration Owner ambiguous | §5 item 3 names what the clause amends and keeps r0 required where the gates require it | ANSWERED in text. The r0 gap is not recorded where anyone acts on it (F4) |
| F4 LOW, §1 imprecise | §5 item 4 corrects all three points | ANSWERED. On #154, #158 and #160 it names the test file but not the manifest ownership fields, which item 1 now covers |
| F5 LOW, no drift for the coverage rule | the coverage probe with its own drift | CLOSED, measured (J1) |
| F6 LOW, `decided_by` at decision | the decider closure | CLOSED for another member's name, measured (M3r and M3c; L3r–L6r; E19r). One residual stays open (F2) |
| F7 LOW, stale messages | updated | CLOSED (read) |
| F8 INFO, disclosure | disposition row 3 now quotes A1 verbatim and says the CHECK is stronger than what the Owner saw | ANSWERED (read) |
| F9 LOW, the caveat | added | CLOSED |
| F10 INFO, the §0 guard's pattern | recorded in §3 and left for its own change | As stated. This file falls outside the guard too, and carries §0 anyway |
| §4 item 1 MEDIUM, a clause added to an approved status line | removed; "Any change to this text, narrowing or widening, needs the Owner" | ANSWERED. A stale word remains (F3) |
| §4 item 3, "do all the work" read as a sequence | the disposition records my note and A0's reading "rather than asserting it" | DISCLOSED. What §5 item 6 now says about it is F1 |

### Q3. The probe restructuring

- **`decideCatalogProbes` is at least as strict as before** (read `run.mjs:441-458`; the verdict test
  run statically):
  - Every earlier wrong-outcome case is still in the verdict test, and two new ones (a second drift
    tripping the first rule; only the second self-test skipped) and the no-self-test probe are added.
  - `raises` comes from the *expected* job built from the probe list, never from an outcome, so an
    outcome cannot supply its own prefix.
  - Outcomes still match on label, kind and exact SQL.
  - A probe with no self-test now fails by name (J5). Before this change it failed as the syntax
    error `undefined`.
- **The executor is unchanged.** Its lines (`run.mjs:1712-1720`) are byte-identical to `8ba29d0`'s,
  and the static test still pins its text.
- **The static test holds drifts equal to raises** (`foundation-contract.test.mjs:2308-2314`; J4, J5).
  The live verdict does not count raises, so a removed drift is caught by the static suite only
  (J4). The README says exactly this.
  - **The test does not hold** that each prefix is non-empty or that it begins exactly one raise.
    Today both are true (measured), and J7 is caught only by the digest (F5).
- **Dropping the FK stale-exemption rule when there are no exemptions is sound.**
  - With `exempt = '{}'`, `unnest(exempt)` yields no row, so the rule could never raise. It was dead
    code that no drift could reach.
  - With one exemption, the rule and its drift are both written again, and the live run refused each
    of its two drifts (J8). The static drift/raise equality held at 2 and 2.
  - A drift that collided with the exempted key would fail the self-test loudly, not pass it.
- **Every rule a drift did not reach before is now reached** (J1, J2, J3, J6).

### Q4. The changed case `editor-a-cannot-cancel-an-approval-request-naming-a-decider`: honest, and disclosed?

**Honest.** The change was forced, not convenient:

- With the closure, the old statement (the approver named) is refused by row level security first
  (O1: 42501). Kept as it was, the case would have had to change its expected outcome.
- A0 kept the id, which is still accurate: the case names a decider, now the caller. The pair alone
  refuses the new form (O2, N1).
- The old statement moved, unchanged, into the new `denied` case
  `editor-a-cannot-cancel-an-approval-request-naming-another-decider`.
  - Its why says "Until 123's corrections this case was the pair's, at 23514"
    (`isolation-cases.mjs:13571` onward).
  - It still fails loudly with 23514 if the closure goes (N5).

**Disclosed** in three places: the record's §2 (Q0 F4 row), the block comment
(`isolation-cases.mjs:13547-13552`) and both cases' whys. It is not in the commit message (F8).

### Q5. Floors and the two family counts

- **Floors.** They equal the guard's own counts (measured).
- **Family counts.**
  - 100: 80 → 81, because the asset_rights case matches `asset-rights`.
  - 120: 82 → 83, because the publish_intents case matches `publish-intent`.
- **Justified.** CI's "Negative control" step disables row level security on a table and needs at
  least one case matching the family pattern to fail (`.github/workflows/ci.yml:176-189`). Both new
  cases are row-level refusals (42501), so they belong to their family's control. The static tests'
  comments say why. That step passed on `f2c1a54` in CI.

### Q6. Ownership and `npm run verify`: clean (measured)

`verify-branch-scope.mjs e276c9a WP-0A-DB-00` exits 0 (31 paths), and `npm run verify` is 672/672 on
both `review/c0-batch-123-fix` and the branch name.

### Q7. Stop-the-line? None

- **Migrations.** No integrated migration was rewritten: 123 exists only on this branch.
- **Secrets.** The scan exits 0.
- **Tenant boundary.** The only new policy is restrictive and ANDed, and all 986 cases pass,
  cross-tenant ones included.
- **Contracts.** No contract mismatch: no approval contract names `decided_*`. The only catalog hit
  is CTR-FLG-001's unrelated `decided_at`.
- **Deletion and side effects.** No irreversible deletion or duplicate external side effect is in
  scope.
- **Findings.** Nothing below is a stop-the-line class.

## §3 Findings

### F1: MEDIUM (governance, for the Owner; read). §5 did not adopt all of A1's tightenings, nothing says which, and one gap bears on the next delegated merge

**What the records say.** The rfc-025 disposition says §5's "items 5–6 are A1's". The record's §2
says §5 "covers" A1 F8 and F9. Neither says what §5 left out of A1's recommendations
(`a1-batch-123-security-review-2026-09-28.md`):

- **F8(d)** (`:477`): a light privacy reading of record-only PRs, because the scanner relaxes the
  email rule for `evidence/`. Not in §5.
- **F9(d)** (`:511`): "Put the delegation in the PR, before the merge, naming PR numbers or head SHAs.
  Words spoken before a PR existed delegate nothing for it." §5 item 6 (RFC `:110`) reads
  instead: "must be given after the PR it names exists, **or must name its sequence explicitly**",
  and does not put it in the PR.
- **F9(f)** second half (`:514`): cite the RFC's digest so that the approved text is the reviewed
  text. Not done for §5 (F3).
- **F9(g)** (`:518`): a stop-the-line finding revokes the delegation for the rest of a stated
  sequence. Not in §5.
- **A1 F3 remedy 2** (`:324`): a live coverage rule for every client-updatable `*_by` column. The
  decider closure is pinned on its one table, but no rule refuses a future table that grants UPDATE
  on `decided_by` without it. Not in the record's §3.
- **A1 F6's README wording** (`:399-400`, "an `app` table"): README `:337` is unchanged. Not in §3.

**Why it matters.** The weaker F9(d) wording is what keeps A0's standing reading alive. The
disposition reads `คุณลุยงานทั้งหมด ตามที่คุณแนะนำ` as a delegation for "batch 123, then batch 091",
and records that 091 did not exist when the words were given. Under A1's wording those words
delegate nothing for 091. Under §5's, they might, if "name its sequence explicitly" is met by
reference to A0's own recommendation. That is a reading the Author makes about its own next merge.

**A related ambiguity.** §5 item 6's "no unresolved security finding of any grade" (RFC `:108`)
does not say whether a finding recorded on a blocker counts as resolved. A1's F4–F6 on 123 are
recorded, not fixed.

**It does not block this PR.** §5 item 6 makes this PR one the Owner merges personally.

**Remedy.**

- Tell the Owner in one line which of A1's tightenings §5 does not contain.
- Ask for an explicit delegation naming 091, if one is intended.
- Add the unadopted items to the record's §3.

### F2: LOW (measured; drift-only, pre-existing in 090). The decider closure binds who, not which row. A decided request can be re-decided in the caller's own name under a looser sibling

**The residual (L5s).** With a looser permissive UPDATE sibling, the approver changed
`approval_request_a1_decided`, which the owner had approved, to `changes_requested`, with itself as
decider: 1 row.

**What still protects a decided row.** Only the permissive policies' USING `status = 'pending'`
(`090_approval.sql:563-568`, `:584-589`). That is the same "bound only inside a permissive policy"
class that 123 closes for the actor's identity. The closure answers A1 F3's evidence "the decider of
an already-decided request can be rewritten" for *another* member's name (L5r), not for one's own.

**What the records say.** 123's comment (`:42-43`) says truly that today a client can update only a
pending request. Neither blocker 186 nor the record's §3 records this residual.

**Remedy (measured).**

- A restrictive `for update to authenticated using (status = 'pending') with check (true)` on
  `app.approval_requests`. rls-smoke passes 986 of 986 with it, and L5s then affects 0 rows (X1b).
  090's replacement and its register entry (13) would move with it.
- **The `with check (true)` is required.** Without it, PostgreSQL applies the USING expression to the
  new row, and seven positives failed (X1).
- Or record the residual beside `created_by`.

### F3: LOW (read). RFC-2026-025's status line is stale, and the approved §5 text is pinned to nothing

**The stale word.** `RFC-…md:3` ends "§5 is the proposed amendment". §5's heading (`:64`) says
"APPROVED".

**The unpinned text.**

- The status line names "this file as committed at `5856f0b`" as the approved text. §5 is not in
  that commit.
- The only commit that carries §5 is `f429fe6`, where it is already marked APPROVED.
- The disposition says A0 "put the RFC's §5 proposed amendment to the Owner in session" and reads
  the answer "as approving §5 as it stood, items 1–6". What the Owner saw is not in the repository.
  I cannot verify that it matches `f429fe6` (§4).

**Remedy.**

- Correct the status line so it names both texts.
- Since §5 item 6 has the Owner merge this PR personally, record that merge as the Owner confirming
  `f429fe6`'s §5, or cite its digest (A1 F9(f)).

### F4: LOW (read). The missing Integration Owner evidence is "recorded as a gap" only in the sentence that says so

**The claim.** §5 item 3 (`RFC:94`) says there is no r0 evidence file "and that is recorded as a
gap".

**Where the gap is recorded.** No open blocker, no handoff `known_limitations` entry and no state
record carries it (grep for `r0_steward` and "Integration Owner" in the manifest's 188 blockers).

**Why it matters for this merge.**

- `CONTRIBUTING_AGENTS.md:69-71` requires linked Integration Owner evidence before the Product Owner
  merges.
- This package's gates include `integration_verified`, and its Integration Owner is
  `/claude/r0_steward`. There is no r0 file.
- `a0-batch-123-integration-2026-09-28.md` is the Author's record. It says it approves nothing, and it
  is not Integration Owner evidence despite its name.

**Remedy.** Record the gap where the Owner will see it before merging, as a blocker or a
known limitation.

### F5: INFO (measured). "Drift *i* answers rule *i*" rests on prefixes that nothing requires to be non-empty or unique

- **What the static test checks** (`foundation-contract.test.mjs:2308-2314`): the count, and that each
  prefix begins its raise.
- **J7.** A `''` prefix passes both checks. The live verdict (`run.mjs:454`) accepts any P0001 for it,
  and only the digest pin notices.
- **Granularity.** A "rule" is a raise. Conditions inside one raise share one drift, for example the
  security definer rule's five checks and the closure rule's seven.
- **Today.** Every prefix is non-empty and begins exactly one raise (measured).

**Remedy.** Assert that each prefix is non-empty and begins exactly one raise in its probe.

### F6: INFO (measured; pre-existing, batch 104). The FK-support probe has no self-test and no digest pin

**Where it sits.** `FK_SUPPORT_PROBE_SQL` (`run.mjs:82`, run at `:1708`) is outside
`CATALOG_RULE_PROBES`.

**J9 with N10.** With its first rule silenced, migrate-clean printed "every foreign key in app and
private has a supporting index" over a live unindexed key. Only the post-migrate re-run of
`104_fk_supporting_indexes.sql#1` failed it, and the static suite exited 0.

**The wording.** README `:362` ("Every rule is shown able to fail on every run") and the record's
"applying the same check to every probe" are scoped to the catalog-rule probes, but the section opens
with this probe.

**Remedy.** Move it into `CATALOG_RULE_PROBES` with a drift per rule, or say "every catalog-rule
probe".

### F7: INFO (read and measured). As approved, the record-only class contains no slot-moving PR

**Why the class is empty.**

- `verify-branch-scope.mjs` fails any declared amendment the branch did not change (`:107`, `:136`).
- So a PR that moves the branch slot must rewrite `ownership.amends_without_owning` and its
  rationale. §5 item 1 excludes "any other manifest field" (`RFC:81`).
- A1 F8(a) would have allowed `amends_without_owning` equal to exactly the two slot files.

**Effect.** This is the safe direction. It also means the exemption, as approved, exempts none of the
PRs it was written for. Widening it later needs the Owner.

### F8: INFO (read). The changed pre-existing case is disclosed everywhere except the commit message

The commit says "Nine cases". Nine are new and one pre-existing case changed. The change is honest
and disclosed (Q4).

### F9: INFO (read). The decider closure is a forward fix no Owner item named, folded in under the standing instruction

- **What the migration says.** `123_…sql:8-11` says so. A1 (F3) and Q0 (F2) each called the fix the
  Owner's choice.
- **Why it is low-risk.** It narrows only, and it refuses nothing that works today (986 cases;
  P1–P3).
- **Who tells the Owner.** The record's §3 and the one-page disposition tell him. He merges this PR
  personally.

### F10: INFO (read). The trigger probe's third drift needs a superuser

`alter role authenticated set session_replication_role = 'replica'` (`run.mjs:421`) needs superuser,
or the SET privilege on that parameter. That holds on the shim and in CI. On a non-superuser target,
migrate-clean would fail the self-test loudly with a non-P0001 error, not silently. I did not measure
that case.

## §4 Limits

- **Independence.** I am the same vendor and model family as the Author, spawned by the Author, under
  the Author's brief (§0).
- **The Owner's words.** In-session words and what the Owner saw of §5 are not in the repository. I
  checked A0's transcriptions against the files only.
- **Environment.** Everything live ran on PostgreSQL 17.11 with the CI shim. Nothing ran against
  Supabase or a non-superuser role.
- **The drift method.** Appending to 140 is Q0's method, and inherits its confound: a catch that reads
  140 alone would not meet the same drift in another file.
- **Coverage.** My drifts and mutations cover the classes the three runs named and the claims in the
  corrections. They are not an exhaustive search of later-migration drift or of runner edits.
- **Governance.** The RFC findings rest on reading, not on executing a delegated or record-only merge.

**Should anything block the Owner's merge?** No stop-the-line was found, and every database and runner
claim in the corrections reproduced. F1 and F3 are for the Owner to hear before he presses the
button, because §5 item 6 makes it his button. F4 is the evidence `CONTRIBUTING_AGENTS.md` asks for
before any merge by the Product Owner. It has been missing for this package throughout, and the Owner
should decide knowingly whether to merge without it.
