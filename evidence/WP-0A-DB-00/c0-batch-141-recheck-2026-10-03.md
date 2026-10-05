# C0 contract review re-check: batch 141's review round

- **Package:** `WP-0A-DB-00`. **Role:** independent Reviewer, run `/claude/c0_contract_reviewer`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-141`, head `8fe0c3137f4d793e64c1e0181d8d623b4878967d` over
  code `3c50ba87f1f95d35db56cab5b004e0a44ea94f9a`, base `e92b896` (main). Author `/claude/a0_atlas`. Draft PR
  <https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/183> (Draft, open, head `8fe0c31`). The previous reviewed
  head was `ad97cde`. My earlier record is `c0-batch-141-contract-review-2026-10-03.md` (on the branch as `2319bbc`,
  cherry-picked from `ce7bdf7`; I measured `git diff ce7bdf7 2319bbc` on that file as empty).
- **Re-check branch:** `recheck/c0-batch-141`, checked out at the subject head `8fe0c31`. This file is its only
  commit.
- **Status:** this file records findings. It advances no status, approves nothing and fixes nothing.
- **Scope:** a narrow re-check. I looked at my own findings first, then the review round's other changes where they
  touch the contract questions.
- **Inputs read:**
  - `CONTRIBUTING_AGENTS.md`;
  - plan §1-§7, with §7 (the review round) read whole;
  - the disposition's review-round additions (D6 corrected, D8-D11);
  - `git diff ad97cde..3c50ba8` for the code and text files, and `3c50ba8..8fe0c31` (the handoff only);
  - both commit messages;
  - RFC-2026-023's new Implemented review-round line and §5.1;
  - RFC-2026-027 §3.4 (`:190-262`), the text §5.1's "Now" quotes must equal;
  - RFC-2026-026's new review-round line;
  - `open_blockers[200]` (1)-(15);
  - CTR-TEN-001's and CTR-AUD-001's schemas for `request_id` and `correlation_id`;
  - `open_blockers[33]` (F15, the earlier "stricter than the contract" precedent).

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author's run, of the same vendor and model family. Under
RFC-2026-024, that makes this an independent-role run by configuration, not by provenance: I share the Author's
training and blind spots. Acceptance of this file as the C0 role's signature is the Integration Owner's and the
Product Owner's act, not mine.

## 1. Verdict

- **Stop-the-line: no.**
- **Blocks the merge: no**, on my reading. Both MEDIUM findings of my first review are fixed:
  - **M1** is measured fixed. Eleven drift variants of my own and two live `migrate-clean` drift rounds were all
    refused (§2).
  - **M2** is read and fixed. Each quoted "Now" equals RFC-2026-027 §3.4's "Becomes" word for word.
- **L1-L4 and N2-N3** are fixed as asked. **L5** is recorded as `open_blockers[200]` (13), and the acceptance it
  needs is still the Integration Owner's and A1's.
- **New findings:** one new LOW (R1, D9's bound is itself a contract narrowing and is not named as one), one LOW (R2,
  a stale "decides nothing new" in the WP rationale) and one note.
- **CI:** run 37273129762 ("Bootstrap validation") on `8fe0c31` was `in_progress` when I wrote this. The previous
  head's run 37268147165 on `ad97cde` was `success`. I make no claim about the new run's result.

## 2. Measured, and how

**Node and branch.** I ran `node -v` before every measured run and got `v24.20.0`
(`/Users/bank/.local/node-v24.20.0/bin`; the PATH Node 26 was not used).

**Measured on the branch name.** The guard and `verify` were measured **on the branch NAME**. I checked out
`agent/claude/WP-0A-DB-00-batch-141` here with `git checkout --ignore-other-worktrees`, at the unchanged ref
`8fe0c31`. Both the local and `origin` refs were `8fe0c31` before and after. `git branch --show-current` printed the
agent branch. When I had measured, I returned to `recheck/c0-batch-141`.

| command | exit | result |
|---|---|---|
| `node scripts/verify-branch-scope.mjs e92b896 WP-0A-DB-00` | 0 | `all 37 changed path(s) are declared, and every amendment explains one` |
| `npm run check:handoff` (branch name) | 0 | `describes the branch: nothing substantive after its cited head` |
| `npm run verify` (branch name) | 0 | `clean: exit 0 — tests 688, pass 688, fail 0, skipped 0, todo 0` |
| live round r1 (5505, fresh) | 0, 0 | migrate-clean: post-migrate pass `53 apply-time blocks, 37 re-run as written, 16 superseded and replaced`; audit producer rule `decided each of its 23 drifts and controls`, "nothing but the two lifecycle functions and the 1 pinned reader(s) names app.workspaces"; rls-smoke `1200 isolation case(s) passed`, `db-authz-proofs: ok — 10 claim(s)` |
| C0 drift variants on r1's catalog, decided by the rule's own `AUDIT_PRODUCER_READ_SQL` and `decideAuditProducerRule` with the run's definer pins, each in a rolled-back transaction | n/a | see the drift table below: the control was clean, and every drift was refused |
| live round r2 (fresh): appended to `140_audit.sql`: `create schema c0x` and an invoker plpgsql `c0x.lifecycle_helper(uuid)` running `update app.workspaces set lifecycle_state = 'closing'` | **2** | `audit producer rule: as built: (i) c0x.lifecycle_helper(uuid) names app.workspaces and is neither a lifecycle writer … nor a pinned reader …` |
| live round r3 (fresh): appended to `140`: `create schema c0v`, `USAGE` to `app_command`, view `c0v.ws` over `app.workspaces`, `grant update (lifecycle_state)` on it to `app_command` | **2** | `172_acting_user_and_closing_command.sql: app_command holds a privilege the closing command and the audit producer do not need: c0v.ws.lifecycle_state UPDATE (P0001)`. This is check 3's widening, held at 172's apply time in a schema that is neither `public` nor A1's. |
| live round r4 (fresh, 140 restored) | 0, 0 | the same as r1: 53/37/16, 23 drifts and controls, 1200 cases, 10 proofs |
| identifier bound on r1 (`~ '^[A-Za-z0-9._:-]{1,128}$'`) | n/a | `'abc'‖LF` → f; 128×`a` → t; 129×`a` → f; a W3C `traceparent` → t; an AWS X-Ray id `Root=1-5759e988-…` → **f**; `''` → f; `'ä'` → f |
| on r4: functions owned by `app_authz`, and `app_command`'s EXECUTE on them | n/a | six: `jwt_subject`, `workspace_member_role`, `is_active_member`, `acting_user_admits_business`, `acting_user_admits_page`, `jwt_aal`, all executable by `app_command`. The handoff's corrected "six, not four" is true. |
| `140_audit.sql` after each drift and at the end | n/a | `cmp` identical to the saved original, sha256 `2ac596bb…c1ad37149` |
| `gh pr view 183`, `gh run list` | n/a | Draft, OPEN, head `8fe0c31`; run 37273129762 `in_progress` on `8fe0c31` |

**The drift variants**, each decided against the live catalog of r1:

| drift | what it adds | first refusal |
|---|---|---|
| `clean` | nothing (the control) | **no refusal** (correct) |
| `c0_i2` | my original i2 under other names: an invoker `public.c0_lifecycle_helper`, called by an `app_command`-owned definer `app.c0_third_command` | `(i) public.c0_lifecycle_helper(uuid) names app.workspaces and is neither a lifecycle writer …` |
| `quoted_upper_schema` | a plpgsql `c0x.h` in a new schema doing `update APP."workspaces"` | `(i) c0x.h(uuid) names app.workspaces …` |
| `unicode_ident` | `update app.U&"workspac\0065s"` | `(i) public.c0_u(uuid) names app.workspaces …` (the lexer decodes `U&""`) |
| `procedure_call` | a plpgsql procedure | `(i) public.c0_p(uuid) …` |
| `atomic_body` | a `BEGIN ATOMIC` SQL body | `(i) public.c0_a(uuid) …` |
| `matview` | a materialized view over `app.workspaces` | `(i) view public.c0_mv names app.workspaces …` |
| `reader_owner_changed` | `app.workspace_member_role` owned by `app_command` | refused twice: `owned by app_command and names app.workspaces` and `reader … not in a reader's shape: owned by app_command` |
| `reader_invoker` | `app.workspace_member_role` made `security invoker` | `reader … not in a reader's shape: not SECURITY DEFINER` |
| `trigger_fn` | a trigger function updating `app.workspaces` | `(i) public.c0_t() names app.workspaces …` |
| `writer_dropped_reader_pin` | the cancel dropped | `(a) pinned producer … does not exist` and `(i) pinned … does not exist` |

**Cluster setup.**
- PostgreSQL 17.11 from `/opt/homebrew/bin`, `initdb --locale=C -A trust -U postgres`, `LC_ALL=C`.
- Listening on 127.0.0.1:5505 only, with `-c unix_socket_directories=''`.
- The shim `db/foundation/ci/supabase-shim.sql` ran first in every round, and each round was re-initdb'd.
- Private directory: `scratchpad/c0-141r2/`. No other port was touched.
- At the end, the cluster was stopped and its data directory removed. `lsof -iTCP:5505 -sTCP:LISTEN` finds nothing.

**Read, not measured:**
- the Author's 5507 rounds;
- Q0's mutation re-runs (M2f, M3c, M2c);
- A1's drift C2 and drift B appended to `140`;
- the `pg_create_subscription` membership refusal;
- the claim that check 7 is held first by `170`'s block. I read check 7's text (`172:575-585`) but wrote no drift
  for it. The plan states plainly that none reaches it.

## 3. My first review's findings, one by one

| finding | status | evidence |
|---|---|---|
| **M1** (MEDIUM): part (i) blind to calls; "stricter than writes" | **Fixed, measured** | (i) is now over every function's header-skipped read and every view's `_RETURN`, whatever the owner or security (`scripts/db/audit-producer-rule.mjs:224-241, 255-256`). The pinned reader's shape (DEFINER, `app_authz`, STABLE/IMMUTABLE) is held, and so is the existence of each pinned name (`:242`). Eleven variants and r2 were refused, and the control is clean (§2). The wording is corrected in the plan (§2 row 7 and §7), `open_blockers[200]` (3), the handoff and the rule's own header ("stricter about reads"; no longer blind to calls). D11 records the remedy chosen, (a) rather than §8/3's fallback, by name. |
| **M2** (MEDIUM): Q-023-3's quotation of RFC-2026-020's amendment missing | **Fixed, read** | RFC-2026-023 §5.1 (`:132-205`, before §6 at `:207`) gives Now/Becomes for the Status line, §5/3 (three places), §6.1/5, §6.1/6 and §6.3/14. Each "Now" equals RFC-2026-027 §3.4's "Becomes" (items 2, 4, 5, 6 and 7 compared word for word against `RFC-2026-027:209-262`). The "any other table" clause is restated, not dropped. The edit of RFC-2026-020 itself stays owed to A1 Identity (`[195]` (b)), as it should. |
| **L1** (LOW): the SELECT policy beyond §8/2 | **Fixed** | RFC-2026-023's Implemented review-round line (1) (`:8`); disposition D10 (`:118`). |
| **L2** (LOW): D6 is a deviation | **Fixed** | Disposition §4's correction; RFC-2026-026 review-round (3); `[200]` (9), with A1's acceptance owed. |
| **L3** (LOW): new stable identifiers unnamed | **Fixed** | Disposition D8 (`:108`); `[200]` (10), with A6's acceptance owed before integration. |
| **L4** (LOW): §8.2/13, §8.1/5, §8.1/3's owner | **Fixed** | Three cases `app-command-cannot-{update,delete,truncate}-the-audit-log` (they ran in r1's and r4's 1200); 172's check 7 (`:575-585`, read); §8.1/3's owner exception in RFC-2026-026's review-round (2) and `[200]` (12). |
| **L5** (LOW): 172 in A1's range before acceptance | **Recorded, still owed** | `[200]` (13): "AT OR BEFORE the merge". This acceptance is the Integration Owner's and A1's. Nothing in this branch can discharge it. |
| N1, N4 | notes, unchanged | as stated in the plan. |
| N2 | **Fixed** | `service-policy-map.json`: "in effect when migration 172 is integrated"; RFC-2026-026 review-round (6). |
| N3 | **Fixed** | `try-it.mjs`: the unrun sentence is dropped. |

## 4. The questions, re-asked against `8fe0c31`

### 4.1 Is 172 still exactly RFC-2026-023 and RFC-2026-026's command half as approved?

**Yes, with R1 below.** The review round changed 172 in three places only (`git diff ad97cde 3c50ba8` on the file):

1. **Both input guards** (`:259`, `:354`) now bound `request_id` and `correlation_id` by shape.
   - This is a narrowing of what the command accepts. It is not a change to the helpers, the `app_authz` widening,
     the transitions, the policies, the producer literal, the scope copy or the fail-closed placement.
   - The guard still raises `22023` before anything is read, so §3.4's "a raised error records nothing" still holds.
   - The body digests in `SECURITY_DEFINER_FUNCTIONS` and the security-definer probe digest in
     `foundation-contract.test.mjs` moved in the same diff, each with its reason.
2. **Check 3's schema test** is widened from `app`/`private` to every non-system schema. This is stricter, and r3
   measured it.
3. **Check 7** is new: no client role holds UPDATE on `lifecycle_state`.

The producer literal, the two transitions and the helpers are byte-identical to `ad97cde`, which I reviewed. The
authz proofs now also execute the cancel's /14, /7 and /16 and the containment proof, and r1 and r4 show 10 claims
green.

### 4.2 Is every pin, block and replacement updated legitimately?

**Yes.**
- **Pins:** two body digests in `run.mjs` and two probe digests in `foundation-contract.test.mjs` (the trigger probe's
  is a comment only). Each move is explained, and `verify` passed with them.
- **Replacements:** no invariant or replacement file changed in the review round. The post-migrate pass is
  unchanged at 53/37/16.
- **Snapshot:** `catalog-snapshot.json` did not change; 172 is still declared not applied.
- **Integrity manifest:** regenerated; `verify` exit 0.

### 4.3 Is anything decided here that the RFCs left open, and is it named?

- **Named:** D8 (vocabulary), D9 (the identifier bound), D10 (the SELECT policy) and D11 (remedy (a) for §8/3), with
  owners on `[200]` (9)-(15).
- **Not named as what it is:** D9's bound is a narrowing of the contract (R1).

### 4.4 Are the claims true?

**True where I re-measured them:**
- 37 paths in scope;
- 688 tests;
- 53/37/16;
- 23 drifts and controls;
- 1200 cases;
- 10 proofs;
- "six functions owned by app_authz";
- the cherry-pick of my record being byte-identical;
- the head and PR state.

**Not true as worded:**
- the WP rationale's "decides nothing new" (R2);
- D9's framing that only a `CHECK` would narrow the contract (R1).

## 5. New findings

Grades follow my first review. MEDIUM means it should be fixed, or recorded by name, before the merge. LOW is a text
fix or a limit to record. A NOTE asks for no change.

### R1 — LOW — D9's bound narrows CTR-TEN-001's `request_id` and `correlation_id` at the command, and is not named as a contract narrowing

- **Where:** `172_acting_user_and_closing_command.sql:259, 354`; disposition §4 D9 (`:114`); `open_blockers[200]`
  (11); plan §7.2's A1 F1 row.
- **The contract:**
  - CTR-TEN-001 (`contract-catalog/shared-kernel/ctr-ten-001/schema.json`) gives `request_id` and `correlation_id`
    only `{"type":"string","minLength":1}`.
  - CTR-AUD-001's `correlation_id` is likewise `minLength 1`, with no bound.
- **What the command does:** both commands now raise `22023` on any id outside `^[A-Za-z0-9._:-]{1,128}$`. I
  measured that a contract-valid AWS X-Ray id (`Root=1-…`, which contains `=`) and a 129-character id are refused.
  A request carrying such an id cannot close or cancel at all.
- **The framing:** D9 and `[200]` (11) call only a `CHECK` on `app.audit_logs` "a contract change owed to that
  contract's owner". The body bound narrows the same values at the only producer that exists.
- **The precedent:** this repository has already treated the same situation as an owed contract divergence.
  `open_blockers[33]` (F15) records 140's not-blank CHECKs as "stricter than the contract's `minLength: 1`
  (CTR-TEN-001's … request_id, correlation_id …)", owed to A0+A6.
- **Why it is LOW:** the choice is reasonable and conservative. It closes A1 F1's free-text channel, it is named as
  D9, and it fails closed (it raises and writes nothing). What is wrong is the classification.
- **Remedy:** in D9 and `[200]` (11), say that the command-level bound is itself a narrowing of CTR-TEN-001's (and
  CTR-AUD-001's) `request_id` and `correlation_id` for these two commands. Owe its acceptance to A6 as the contract
  owner, beside D8, or put a bound into the contract through its owner. The server tier must also be told that ids
  outside the class are refused, or a request's own ids could make the close unreachable.

### R2 — LOW — The WP rationale still says the batch "decides nothing new"

- **Where:** `work-packages/WP-0A-DB-00.json:122`, `ownership.amends_without_owning.rationale`: "It implements two
  APPROVED decision records and decides nothing new."
- **The finding:** the disposition's review-round section now says that sentence "was not true as worded" (C0 L1, L3)
  and adds D8-D11. The review round's text appended to the same rationale does not retract it. The two statements in
  the package now disagree.
- **Remedy:** append one clause to that rationale: "(corrected in the review round: D8-D11 in the disposition §4 are
  decisions this batch made, each named with its owner on `open_blockers[200]`)".

### N1 — NOTE — Part (i) now leaves no slot for a SECURITY INVOKER reader of `app.workspaces`

- **The constraint:** after D11, any later function that names `app.workspaces` must be one of the two lifecycle
  writers or must take the pinned reader's shape (DEFINER, `app_authz`, STABLE). A later invoker reader, for example
  a client-facing function, will be refused, and the rule will have to change in a reviewed diff.
- **Why it is only a note:** this is the intended price of exactness, and D11 says the rule is "stricter than before,
  never looser". Later batches should know it before they write such a function.

## 6. Stop-the-line

No. None of the stop-the-line classes in CONTRIBUTING_AGENTS.md is present.

- **Secret exposure:** none.
- **Tenant leakage:** none. The cross-tenant cancel case passes, and it leaves no row in A's log.
- **Duplicate external side effect, lost job:** none.
- **Migration divergence:** none. No integrated migration changed: `140_audit.sql` is byte-identical to main, and 172
  is declared not applied.
- **Irreversible deletion:** none.
- **Contract mismatch:** no contract-catalog file changed. R1 is a narrowing of what is accepted, recorded under the
  wrong label. It does not produce a record that mismatches the contract, because every row the command writes still
  satisfies CTR-AUD-001.

## 7. Limits of this re-check

- **It is narrow.** I did not re-read the 13 new cases one by one, or the authz-proof additions line by line. I relied
  on the runner's counts (1200, 10) and on Q0's role for the tests' adequacy.
- **Not measured:**
  - Q0's mutation re-runs;
  - A1's drifts B and C2 and the subscription-membership drift;
  - check 7's own refusal (no appended drift reaches it, as the plan says);
  - try-it (the tool refuses port 5505, as before);
  - the platform's `aal` claim and function ownership under a non-superuser applier.
- **The drift variants were decided** by the rule's decision function against the live catalog. Only r2 and r3 were
  run through `migrate-clean` end to end.
- **CI:** run 37273129762 on `8fe0c31` had not finished when I wrote this.
- **Independence:** same vendor and model family as the Author (§0).
