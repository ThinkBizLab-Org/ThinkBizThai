# A0 plan and record: batch rfc-026-static-rule, RFC-2026-026's static rule closed in its text, still Proposed

- **Package:** `WP-0A-DB-00`. **Author:** `/claude/a0_atlas` (written by a subagent of that run).
- **Branch:** `agent/claude/WP-0A-DB-00-batch-rfc-026-static-rule`, from `main` at `dc6d481` (PR #179, the rfc-text
  batch, merged 2026-10-04T18:45:52Z by A0 at its reviewed head `8dc33ba`, CI run 37225078364 green, under the
  Owner's standing delegation; see the disposition §3). `git branch --show-current` printed the branch name before
  every commit and every measured run.
- **Commits:**
  - `16b839b` is the code commit: RFC-2026-026, the manifest, the branch slot and the integrity manifest.
  - The commit after it holds this plan, the disposition, and the correction appended to the rfc-text plan.
  - The handoff comes last, alone.
- **Status:** written and measured by the Author. Not reviewed, not tested by an independent role, and not
  approved. C0, Q0 and A1 role runs follow. The PR is a Draft.
- **The Owner's words:** `เอาตามแนะนำ` (2026-10-05). They answer A0's test-point summary, whose item 2 said
  RFC-2026-026/027 need A0's §8.1/1 text fixes before approval. A0 reads the words as authorising those text
  fixes only. Q-026-10 stays UNANSWERED. See `product-owner-disposition-2026-10-03-batch-rfc-026-static-rule.md`.
- **Inputs:**
  - RFC-2026-026 as merged: §8.1/1, §3.7, §10 and Q-026-10.
  - `open_blockers[195]`'s sentence "OWED BEFORE RFC-026 APPROVAL".
  - `a0-batch-rfc-text-plan-2026-10-03.md` §6-§7.
  - The re-checks `c0-`, `a1-` and `q0-batch-rfc-text-recheck-2026-10-03.md`: C0-RR-1..5, A1 N1..N5, Q0 R1..R6.

**No migration, and nothing a database layer reads changed.** This batch changes:

- the text of one Proposed decision record;
- `open_blockers[195]`, appended in place (the manifest keeps 459 lines, so the coverage map's line pins do
  not move);
- the branch slot;
- evidence.

The revised rule was **prototyped** on a throwaway cluster (§2), with both layers run twice on a clean tree.
**RFC-2026-026 is not approved and Q-026-10 is not answered.** The Status line still says Proposed. A0's
recommendation on Q-026-10 is recorded in the question's text as a recommendation.

## 1. Finding → change → what proves it

| Finding | Grade | Change in RFC-2026-026 | Test or drift (§2) |
|---|---|---|---|
| A1 N1 | MEDIUM | §8.1/1 "Which functions it reads": extension members **included**, as batch 128's third SECURITY DEFINER rule reads them. A `c`/`internal` function is stated as opaque | drift 9 (r3): an invoker writer in `public` made a pgcrypto member migrated clean (exit 0) and is selected by (a). On clean trees (r1, r5) the 36 members select nothing |
| A1 N2, Q0 R2 | MEDIUM | New (f): `pg_rewrite` is read for every relation in the `userObject` scope. Only a view's or materialized view's `_RETURN` is allowed. A `_RETURN` naming a producer is refused, and one naming an audit table must be a pinned reader. §9/4: `REWRITE_RULE_PROBE_SQL` is widened if (f) is held through it | drift 10 (r3): a `do also insert into app.audit_logs` rule on `public.s_rule_target`, and a view selecting a producer, migrated clean. (f) selects both |
| C0-RR-1, Q0 R1 | LOW | (b) skips the name tokens between level 0's first `FUNCTION`/`PROCEDURE` and the `(`, and reads all the rest, argument defaults included. `prosrc` is rejected as the alternative: it misses defaults and `BEGIN ATOMIC` bodies | drift 5 and control 5b (r3). The stripped (b) selects the caller `app.s_caller` only; the unstripped reading also selects the stand-in `app.s_producer` |
| C0-RR-3, Q0 R5 | INFO | New bullet "What a lexer refusal means". A refusal at level 0, or in the dollar-quoted body `pg_get_functiondef` prints, fails the function closed, and so does any `beyond`. A refusal inside a literal of the body does not | drift 13's control (r3): `app.s_prose` (an apostrophe message and a JSON literal) has 3 inner refusals and is not refused. On r1/r5, no level-0 or body refusal: 36 pgcrypto members have 1 each, in the `'$libdir/pgcrypto'` string, and `rls-smoke`'s `as_*` have 1-2 each, all inner. The fail-closed half (a body stored with `check_function_bodies` off) is named as drift 13 and not measured |
| Q0 R3 | LOW | Drift 1 is now the invoker form, asserting (a)'s own text. Drift 1b, the SECURITY DEFINER form, pins the function in `SECURITY_DEFINER_FUNCTIONS` inside the drift, so that (a) refuses it. Without the pin, 1b asserts the probe's message | r3: the invoker form migrated clean and is selected by (a). r4: the SECURITY DEFINER form exits 2 at `migrate-clean` with "not a pinned SECURITY DEFINER function". The pinned form is not measured, because it edits `run.mjs` |
| Q0 R6 | INFO | Every function on the pinned reader list is `STABLE` or `IMMUTABLE`. Views on the list are read by (f) | drift 12 (r3): a pinned reader made `VOLATILE` is refused. r3-extra: a `STABLE` PL/pgSQL inserter was created, and calling it failed with "INSERT is not allowed in a non-volatile function". A `STABLE` SQL inserter was created too, so the check is at run time |
| (A0) | — | New (g): no column default, `CHECK` constraint, policy expression, or index expression or predicate names a producer. **A0's own addition; no reviewer raised it** | drift 11 (r3): a default calling the stand-in producer migrated clean and is selected. The policy arm (r2's first attempt) exited 2 at `migrate-clean`, refused by the policy helper probe and the policy set probe |
| C0-RR-4, A1 N4, Q0 R4 | INFO | §8.1/1's last paragraph: 14 functions after `migrate-clean` (18 after `rls-smoke`). The rfc-text plan has a §8 appended | r1, r5: 14 non-member functions (`app` 9, `private` 4, `auth` 1) after `migrate-clean`, and 18 after `rls-smoke` (`private` 8) |
| C0-RR-2, A1 N3 | LOW | §3.7 and Q-026-10's option (i): `app.security_events` has no column for the attempted id. Naming it needs a forward migration in batch `140`'s range, which goes against Q-026-9's accepted "no store change before G1", or the id written into `event_type`. Without either, the row records that an attempt happened, not where, and an actor with no reachable workspace gets no row | read against `140_audit.sql:583-617` |
| — (the brief) | — | Q-026-10 carries **A0's recommendation, (iii)**: accept the gap explicitly beside Q-026-4 until Paid Beta, with SEC-014's producer owed. It needs no store change before G1, which matches Q-026-9's accepted answer. The question stays **UNANSWERED**. The Status line, §10's intro and §11 say so | read |
| C0-RR-5, A1 N5 | INFO | The circular citation is corrected in `a0-batch-rfc-text-plan-2026-10-03.md` §8 (appended). This batch's handoff cites its own plan §3 and its PR body, and not the earlier plan | read |
| Branch slot | — | `ownership.branch` and both rows of `test-kits/branch-identity.test.mjs` move from `…-batch-rfc-text` (merged as #179) to `…-batch-rfc-026-static-rule` | the branch-identity tests; `check:handoff` |
| Amendments | — | The rationale is rewritten and names the TWO files amended outside ownership: `test-kits/branch-identity.test.mjs` and `test-kits/integrity-manifest.json`. No test is added, so `evidence/VERIFICATION.md` and `scripts/test-suite-contract.mjs` are not amended | `verify-branch-scope` exit 0 |
| `open_blockers[195]` | — | Appended, with the old text a strict prefix and the 196 other entries byte-equal (checked by script). The text items are marked done. Q-026-10's answer, approval of both RFCs, the rule and its drifts 1-13, the probe widening and the driver change stay owed, each with its owner. (g) is flagged for review first | read; `npm run check` |
| Integrity manifest | — | Regenerated: 90 digests. RFC-2026-026 and `branch-identity.test.mjs` changed | D1 |

Every finding the inputs recorded is accounted for:

- **Done in the text:** C0-RR-1..5, A1 N1..N5 and Q0 R1..R6.
- **Still owed on `[195]`, with owners:** RFC approval (the Owner and A1), Q-026-10 (A1 and the Owner), and the
  rule's implementation (A0, with the command half).

No new blocker is added, so no blocker's text is duplicated.

## 2. Prototype rounds (port 5507, private dir `a0-rfc-026-static-ruler/`)

**Setup for every round:**

- Node `v24.20.0`, from `/Users/bank/.local/node-v24.20.0/bin`; `node -v` was printed before every round.
- PostgreSQL 17.11 from `/opt/homebrew/bin`.
- `initdb --locale=C -A trust -U postgres` every round.
- TCP only on 127.0.0.1:5507 (`unix_socket_directories=''`), with `LC_ALL=C` and the shim first.
- Drifts were appended to `db/foundation/migrations/140_audit.sql` and restored from a copy. The sha256 was
  `2ac596bb950e8dfb…` before and after every round.
- Each cluster was stopped and its data directory removed. No other port was touched.

**What `rule.mjs` is.** The rule does not exist yet. `rule.mjs` is A0's hand application of the revised §8.1/1:

- It applies `walkLevels` to `pg_get_functiondef`, `pg_get_ruledef` and the deparsed stored expressions.
- Its scope is `userObject`, extension members included.
- Its pinned sets are passed on the command line.

It is a prototype. It is not the rule, and it is not the rule's self-test.

| round | tree | `migrate-clean` | `rls-smoke` | prototype |
|---|---|---|---|---|
| r1 | clean | 0 ("51 apply-time blocks, 39 re-run as written, 12 superseded") | 0 (1087 cases, 6 authz proofs) | exit 0. It read 50 functions (36 extension members, `c`; plus `app` 9, `private` 4, `auth` 1), 0 rules and 715 stored expressions. Nothing was selected and nothing refused closed. After `rls-smoke`: 54 functions read (`private` 8), nothing selected |
| r2 (first attempt) | r2.sql: the r3 drifts plus a policy calling the producer | **2**: "policy helper probe: … function(s) a policy calls that are not pinned by body: app.s_producer(w uuid)" and "policy set probe: … public.s_def.s_pol" | not run | (g)'s policy arm is held first by the existing probes |
| r3 | r3.sql (pinned: producer `app.s_producer`; readers `app.s_reader`, `app.s_reader_vol`, `public.s_reader_view`) | **0** ("51 … 39 re-run") | not run | exit 1. Each part selected its drift and nothing else (the selections are listed below the table). r3-extra: `app.s_reader_writes()` called: "INSERT is not allowed in a non-volatile function"; a `STABLE` SQL-language inserter was created (rolled back); `s_ext_member` is a pgcrypto member with `prosecdef = f` |
| r4 | r4.sql: drift 1b (SECURITY DEFINER writer, `EXECUTE` revoked from PUBLIC) | **2**: "security definer probe: as built: … app.s_d1b() [not a pinned SECURITY DEFINER function]" | not run | (a) also selects `app.s_d1b`; the probe refuses it first |
| r5 | clean | 0 (as r1) | 0 (1087 cases, 6 authz proofs) | as r1, before and after `rls-smoke` |

**r3, what the prototype selected:**

- (a): `app.s_d1` (drift 1), `public.s_ext_member [extension member]` (drift 9), and `app.s_reader_writes` (an
  unpinned `STABLE` writer).
- (a)'s attribute check: `app.s_producer`, because it is invoker and owned by `postgres`, as it must be. An
  unpinned SECURITY DEFINER stand-in would fail the probe first.
- The reader rule: `app.s_reader_vol [volatile]` (drift 12).
- (b): `app.s_caller` only (drift 5). The unstripped reading would also select `app.s_producer` (control 5b).
- (c) and (e): nothing.
- (f): `public.s_rule_target.s_rule_audit` and `public.s_view_producer._RETURN` (drift 10).
- (g): the default `s_def.a` (drift 11).
- Refused closed: nothing. `app.s_prose` had 3 inner refusals (drift 13's control).

The review round's text would not have read drifts 9, 10 and 11, because its scope excluded them. That is true
by construction and was not run separately. Its (b) would have selected the stand-in producer; that was measured,
in the "unstripped" line.

## 3. Commands and exit codes

| command | exit | result |
|---|---|---|
| `npm run regenerate:manifest` | 0 | "rebuilt 90 digest(s)" |
| `npm run check`, before the code commit, on the branch name | 1 | tests 685, pass 683, fail 2: "the handoff for this branch describes this branch" and "the handoff ratchet fails when an author handoff claims another role approved something". These are the not-yet-refreshed handoff guard and nothing else |
| `node scripts/commit-when-clean.mjs` (code commit) | 1 | refused: "tests 685, pass 683, fail 2" on the same tree. **`16b839b` is a plain `git commit`** of the four code paths, because the only red was the not-yet-refreshed handoff guard |
| `node scripts/verify-branch-scope.mjs dc6d481 WP-0A-DB-00` at `16b839b` | 0 | "all 4 changed path(s) are declared, and every amendment explains one" |
| D1: one byte appended to RFC-2026-026, digest not regenerated; `node scripts/verify-test-coverage-floor.mjs` | 86 | "RFC-2026-026-audit-row-producer.md — content does not match its recorded digest" (restored; `git diff` empty) |
| r1-r5 (§2) | as §2 | — |

The evidence commit goes through commit-when-clean; if the handoff guard is its only red, it is a plain commit,
and the PR body says which. Next, `npm run refresh:handoff` runs last and alone. Then `npm run check:handoff`,
`verify-branch-scope` at the head, and `npm run verify` run on the branch name. Their exit codes are recorded in
the handoff's `tests` and in the PR body, which come after this file. They are not recorded here, and the
handoff does not cite this section for them (C0-RR-5).

## 4. What is not done

- RFC-2026-026 is not approved, and this package cannot approve it. RFC-2026-027 is not touched.
- Q-026-10 is not answered. A0's recommendation is not the Owner's answer.
- The rule does not exist. §8.1/1 (a)-(g) and drifts 1-13 are owed to the batch that lands the command half,
  together with these two changes:
  - `REWRITE_RULE_PROBE_SQL` widened, if (f) is held through it;
  - `psql-driver.mjs` refusing nested `BEGIN ATOMIC`.
- Not measured: drift 1b's pinned form, and drift 13's fail-closed half.
- (g) is A0's own addition and has had no review.

## 5. Private artefacts (not in the repository)

These are under the scratchpad directory `a0-rfc-026-static-ruler/`:

- the scripts `cluster.sh`, `round.sh`, `rule.mjs`, `splice.mjs` and `manifest-edit.cjs`;
- the drift files `r2.sql`, `r3.sql`, `r3-extra.sql` and `r4.sql`;
- the logs `r1`-`r5` (`*-migrate.log`, `*-rule.log`, `*-smoke.log`, `*-extra.log`), `r2-first-attempt*.log`,
  `check1.log`, `cwc-code.log` and `d1.log`;
- the old and new §8.1/1 texts, the `140_audit.sql` original, and the commit messages.
