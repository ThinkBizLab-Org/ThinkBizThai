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

## 6. Review round (2026-10-05)

Written by a subagent of `/claude/a0_atlas`, on the branch name `agent/claude/WP-0A-DB-00-batch-rfc-026-static-rule`
(`git branch --show-current` printed it before every commit). It fixes; it approves nothing. **No migration, and
nothing a database layer reads changed.** RFC-2026-026 stays Proposed and Q-026-10 stays UNANSWERED.

### 6.1 Cherry-pick map

Each review was cherry-picked with `-x` onto `fb508e7`, unchanged:

| role | review branch | reviewed commit | on this branch |
|---|---|---|---|
| C0 `/claude/c0_contract_reviewer` | `review/c0-batch-rfc-026-static-rule` | `6d0c27f3d6fa7ae3a6be588bbc60c17c7e43ff63` | `32adffc8f516e9bb8f6bd2df3fd1b7a3cef7a723` |
| A1 `/claude/a1_bastion` | `review/a1-batch-rfc-026-static-rule` | `c1e48a066a0f2af8cdc152d3840ada08bea38e08` | `c033a293fffb8c4f42972d3ddeb923740362cae9` |
| Q0 `/claude/q0_sentinel` | `review/q0-batch-rfc-026-static-rule` | `1665deb6190377b7494dab3cb43d862080e63396` | `3df23a8f39b0c2a73e32e2c679b80816b49ec977` |

All three report **no stop-the-line** and nothing that blocks this Draft's merge; every finding is owed before
RFC-2026-026's **approval**.

### 6.2 Finding → change → measured

"§8.1/1" is RFC-2026-026's. "Measured" is §6.3's prototype of the added arms, unless a reviewer is named.

| finding | grade | change | measured |
|---|---|---|---|
| A1 N1 | MEDIUM | New **(h)**: `pg_extension` is exactly `APPROVED_EXTENSIONS` + `plpgsql`; `pg_foreign_data_wrapper`, `pg_foreign_server`, `pg_user_mapping`, `pg_foreign_table` are empty, each with an empty pinned exemption list. The catalogs are added to §8.1/1's list. Drift 19 is A1's r7, asserting (h)'s own text. The live `run.mjs` probe of the four catalogs, which is not specific to audit tables, is a **new blocker, `open_blockers[197]`** | s5 (A1's r7, port changed): `migrate-clean` exit 0, (h) selects the extension, wrapper, server, mapping and foreign table. s1 (clean): none, before and after `rls-smoke` |
| Q0-S1 | MEDIUM | (b) also reads **`pg_depend`**: no object but a pinned one depends on a producer. Line 584's sentence is replaced by what holds it: (b)'s token read and `pg_depend` read, (c), (e), (f), (g) and the `pg_catalog` guard for casts. Drift 16 (operator in a trigger function, a default and a view; aggregate) | s4 (Q0's `q0-r3.sql`): `pg_depend` selects the operator, the trigger `q_when`, the domain check and the aggregate. s3 (A1's r3): the operator, the domain and the aggregate |
| Q0-S2 | MEDIUM | (g) reads **`pg_trigger.tgqual`** through `pg_get_triggerdef`; (e) says the `WHEN` is (g)'s and (b)'s. Drift 14 | s4: (g) and `pg_depend` both select `q_when`. s2 (C0's `c2.sql`): both select `s_when` |
| A1 N2 | LOW | Same `pg_depend` arm; (g) reads **`pg_type.typdefaultbin`**; an aggregate (no `pg_get_functiondef`, language `internal`) and a window function in `c`/`internal` fail closed unless pinned; drift 20 (cast) is cited as the `pg_catalog` guard's hold, and a cast drift on the guard is owed (its self-test drift has none) | s3: operator, domain default and aggregate selected; the aggregate also by the language rule (`public.s_agg [internal]`) |
| A1 N3 | LOW | (c) gains a **language rule**: `sql` or `plpgsql`, or a `c` member of an approved extension; anything else fails closed. It cites the `pg_catalog` guard (PL handlers), the definer extension-member rule (`dblink_connect_u`) and the driver's `REFUSED_LANGUAGES` as today's holds. Drift 18 asserts the rule's own text; the PL and dblink shapes are cited | s6 (A0's `d-lang.sql`): an `internal` alias of `int4pl` and a raw `c` function, the language word computed, **`migrate-clean` exit 0**, both selected. s1: on a clean tree nothing |
| C0-SR-1 | LOW | (g) adds `tgqual` and `typdefaultbin`; `pg_constraint` is scoped by `connamespace`, so a domain `CHECK` is read; the catalog list at the head of §8.1/1 is extended and called an enumeration a reviewer checks. Drifts 14, 15 | s2: trigger `WHEN`, domain default and domain `CHECK` each selected by (g) and by `pg_depend` |
| C0-SR-2 | LOW | (c) gains a **pinned list of functions that execute their text argument** (`query_to_xml`, `query_to_xmlschema`, `query_to_xml_and_xmlschema`, `ts_stat`, `ts_rewrite`), refused wherever named, failing closed: re-read against the server version, and extended only through (h)'s extension list. The ":594" sentence now says the three parts of (c) together keep (a)/(b) decidable. Drift 17 | s2: `public.s_qx names query_to_xml`; s1: none |
| C0-SR-3 | LOW | The drifts name their harness: `run.mjs` `selfTests` (`probeJobScript`, `decideCatalogProbes`). 1b needs no pin and asserts (a)'s own text. Drifts 8, 11's policy arm, 18's PL/dblink shapes and 20 are **cited** as existing probes' holds, not this rule's self-tests; (d) and (g)'s policy arm say they have no self-test of their own | read against `run.mjs:2480-2580` |
| C0-SR-4 | LOW | §3.7, Q-026-10's row and §10.1's Q-026-9 row quote the accepted words verbatim ("A forward migration adding a nullable cause column is not recommended before G1", disposition rfc-026-027 `:130`). (i)'s column and (ii)'s store are stated as new store questions Q-026-9 did not decide, priced on their merits. A0 keeps (iii) as the recommendation and withdraws the "matches Q-026-9" reason | read |
| Q0-S3 | LOW | (a): every view on the reader list has `pg_relation_is_updatable(oid, false) = 0` and no `INSERT`/`UPDATE`/`DELETE` grant to a role but its owner. Drift 12 gains the view | s4: `public.q_reader_upd [updatable 28; grants none]` selected |
| Q0-S4 | INFO | "Which functions it reads": an aggregate fails closed under the language rule and its calls are read through `pg_depend` | s3, s4 |
| Q0-S5 | INFO | (g): `pg_constraint` scoped by `connamespace`, domains included | s4: `q_dom_check` selected |
| Q0-S6 | INFO | Recorded here: A0's `r3-extra.sql` also tried `app_command` inserting into `public.s_rule_target`, and it failed on `audit_logs_reason_key_form` (`reason_key` `s.drift`). No claim rested on it; the forged-row measurement in (f) is A1's | — |
| C0-SR-5 | INFO | §3.7 and Q-026-10: the id goes into `event_type` "as a dotted segment"; the CHECK refuses a bare id | read against `140_audit.sql:598-599` |
| C0-SR-6 | INFO | (a): a producer has a dollar-quoted body, not `BEGIN ATOMIC`, since the definer probe pins `md5(prosrc)`; or the landing batch pins `md5(pg_get_functiondef(oid))` | read (C0's M9) |
| C0-SR-7 | INFO | This round's handoff records commands run after its own commit without an exit code, pointing to the PR body | the handoff's `tests` |
| C0-SR-8 | INFO | "zero to two each (`as_suspended_user` none)" | read (C0's M4) |
| A1 N4 | INFO | One bullet in §8.1/1 cites the event-trigger probe (`PINNED_EVENT_TRIGGERS`) and the policy helper probe as holds of this rule | read |
| A1 N5 | INFO | Q-026-10's row names the events lost (cross-tenant probing; SEC-014's P0 rate limit), says "not of isolation" is conditional on §3.3's literal being executed, and says SEC-014's deadline needs a blocker with an owner if (iii) is chosen | read |
| C0 §2.2 | — | `16b839b`'s message says drift 1b is "reshaped so (a)'s own text refuses it", true only of the pinned form at the time. A merged commit message is not rewritten; the RFC now states 1b correctly for the `selfTests` harness | — |

**New, found while measuring (not a reviewer's finding):** s6 shows an `internal` or `c` function, its language
word computed in a `DO` block, passes `migrate-clean` with every probe green. The driver's header says computed
text is "held by the live catalog probes in run.mjs", and no live probe reads a function's language. An `internal`
function can alias any built-in under a name no list holds (the driver's own comment), so this is the class of
A1 N1 and is not specific to audit tables. It is recorded on `open_blockers[197]` beside the foreign-data probe,
owed to the Integration Owner with A1; it needs a migration written to evade the driver, as every drift here does,
and nothing in the tree does it. I did not measure what such an alias can reach.

### 6.3 Prototype of the added arms (port 5507, private dir `a0-rfc-026-static-ruler2/`)

Same setup as §2: Node `v24.20.0` (`node -v` printed every round), PostgreSQL 17.11 from `/opt/homebrew/bin`,
a fresh `initdb --locale=C -A trust -U postgres` every round, TCP only on 127.0.0.1:5507
(`unix_socket_directories=''`), `LC_ALL=C`, the shim first. Each drift was appended to `140_audit.sql` and
restored from a copy: sha256 `2ac596bb950e8dfb…` before and after every round, `git status` clean after. Each
cluster was stopped and its data directory removed; no listener on 5507 after. No other port was touched.

`arms.mjs` is a hand application of **only the arms this round adds**, with the repository's lexer and
`APPROVED_EXTENSIONS` imported. It is not the rule and not its self-test. The reviewers' drift files were
re-run unchanged but for A1's port string.

| round | drift | `migrate-clean` | `rls-smoke` | arms |
|---|---|---|---|---|
| s1 | none | 0 ("51 apply-time blocks, 39 re-run as written, 12 superseded") | 0 ("1087 isolation case(s) passed"; "6 claim(s) discharged") | exit 0, all green: 50 functions read, 54 after `rls-smoke` |
| s2 | C0's `c2.sql` (producer `public.s_producer`) | 0 | — | exit 1: `pg_depend` trigger `s_when`, type `s_dom`, constraint `s_dchk_check`; text-executing `public.s_qx`; (g) the `WHEN`, the domain default and the domain `CHECK` |
| s3 | A1's `r3.sql` (producer `app.s_producer`) | 0 | — | exit 1: `pg_depend` operator `###`, type `s_dom`, aggregate `s_agg`; language `public.s_agg [internal]`; (g) the domain default |
| s4 | Q0's `q0-r3.sql` (producers `app.q_producer`, `app.q_producer2`; reader `public.q_reader_upd`) | 0 | — | exit 1: `pg_depend` operator `@@@`, trigger `q_when`, constraint `q_dom_check`, aggregate `q_agg`; language `public.q_agg [internal]`; (g) `q_when`, `q_dom_check`; reader view updatable 28 |
| s5 | A1's `r7.sql`, port 5507 | 0 ("52 apply-time blocks, 40 re-run") | — | exit 1: (h) extension `postgres_fdw`, its wrapper, server `s_loop`, a user mapping, foreign table `s_a1.s_ft`; language: postgres_fdw's five `c` members |
| s6 | `d-lang.sql` (A0's) | 0 ("52 … 40 re-run"; a first form not written to re-run failed the post-migrate pass, 42723, and was made `create or replace`) | — | exit 1: language `s_lang.s_int [internal]`, `s_lang.s_cfn [c]` |

Nothing a database layer reads changed in this round, so the two clean layers were run once (s1), as the
measurement of the arms on a clean tree, and not as a regression check.

### 6.4 Commands and exit codes

Before this file's commit, on the branch name, Node `v24.20.0`:

| command | exit | result |
|---|---|---|
| `npm run regenerate:manifest` | 0 | "rebuilt 90 digest(s)" |
| `npm run check` | 0 | tests 685, pass 685, fail 0 |
| `node scripts/commit-when-clean.mjs` (code commit `9fd448b`: RFC-2026-026, the manifest, the integrity manifest) | 0 | "clean: exit 0 — tests 685, pass 685, fail 0" |

The commands run on the final head (`verify-branch-scope`, `check:handoff`, `verify`) are recorded in the PR
body and the handoff, which come after this file; not here (C0-RR-5). The plan's §3 stands for the batch's
first commits.

### 6.5 What is still owed

- Everything §4 lists, plus: (h), the `pg_depend` read, the language rule, the text-executing list, the `tgqual`,
  `typdefaultbin` and domain-`CHECK` reads, the reader-view rule and drifts 14-20, all in the rule's batch (A0,
  batch 141's range); a cast drift on the `pg_catalog` guard. Appended to `open_blockers[195]`.
- The live foreign-data and function-language probe in `run.mjs`, not specific to audit tables:
  `open_blockers[197]`, new.
- Approval of RFC-2026-026 and RFC-2026-027, and Q-026-10's answer: unchanged, the Owner's and A1's.
- Re-checks of this round by C0, A1 and Q0.
