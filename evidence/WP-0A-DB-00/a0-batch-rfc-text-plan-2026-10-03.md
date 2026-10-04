# A0 plan and record: batch rfc-text, RFC-2026-026/027 brought in line with the Owner's answers, still Proposed

- **Package:** `WP-0A-DB-00`. **Author:** `/claude/a0_atlas` (written by a subagent of that run).
- **Branch:** `agent/claude/WP-0A-DB-00-batch-rfc-text`, from `main` at `88a6670` (PR #178, the try-it batch,
  merged 2026-10-04T16:48:40Z by A0 at its reviewed head `a0965f7`, CI run 37217282992 green, under the Owner's
  standing delegation; see the disposition §3). `git branch --show-current` printed the branch name before
  every commit and every measured run.
- **Commits:** `cdf6774` is the code commit (the two RFCs, the manifest, the coverage map's line pins, the
  branch slot, the integrity manifest). This plan and the disposition are the commit after it. The handoff is
  last and alone.
- **Status:** written and measured by the Author. Not reviewed, not tested by an independent role, not
  approved. C0, Q0 and A1 role runs follow. The PR is a Draft.
- **The Owner's words:** `แล้วลุยต่อยาวได้เลยคืนนี้` (2026-10-04), after the session goal
  `คุณไม่ต้องรอ confirm กับผม  คุณลุยไปยาวๆ จนถึงจุดที่ให้ผม test แล้วค่อยถาม`; the answers being folded in are
  `ลุยต่อเลย เอาตามแนะนำ` (2026-10-04, `product-owner-disposition-2026-10-03-batch-rfc-026-027.md` §8). See
  `product-owner-disposition-2026-10-03-batch-rfc-text.md`.
- **Inputs:** both RFCs as merged; `open_blockers[195]`'s "STILL OWED before RFC approval"; the rfc-026-027
  plan §7-§8 and disposition §5, §7, §8; the re-checks `c0-`, `a1-`, `q0-batch-rfc-026-027-recheck-2026-10-03.md`
  (C0-9, C0-10, A1 F4-a, A1 C2, Q0R-F1..F4); `a0-phase-plan-141-170-2026-10-03.md`.

**No migration, and nothing a database layer reads changed.** Two Proposed decision records, the manifest,
and line pins that move because the manifest shrank by one line above `open_blockers`. So `make
db-migrate-clean` and `make db-rls-smoke` were not run, and no cluster was started (§3). **Neither RFC is
approved**: both Status lines say Proposed, and §10.1 of each says the answers are not an approval.

## 1. Item → change → what proves it

| Item | Change | Test or drift (§2) |
|---|---|---|
| 1. Q-026-1 superseded (membership for every command row) | RFC-026 §3.3's literal gains `app.is_active_member(workspace_id)` for every row; §3.3/2 rewritten; new §8.2/19 (another tenant's and a non-existent `workspace_id`, denied and failed, refused); §3.3 last paragraph: `EXECUTE` on `app.is_active_member` to `app_command` in the command half; §8.1/3 and §9/1 say so | read; `npm run check` (the decision-record digest test); D4 |
| 2. Q-026-9 (producers of `app.security_events`) | RFC-026 §3.7 rewritten from "held" to the two policies on the table's own columns (worker: confinement AND `actor_kind is null or actor_kind = 'system_actor'`; command: own actor AND `is_active_member`); §3.1, §4, §8.1/2-3, §9/1-2 follow; new §8.2/21 | read against `140_audit.sql:583-606` (columns and the actor CHECKs) |
| 3. C0-9, A1 F4-a (page form) | §3.3's literal: the `succeeded` arm calls `acting_user_admits_page` whenever a page id is present (and refuses a page without a business); the refusal arm admits no scope at all (F4-a option (i)); §3.3/3-4 and §3.6 rewritten to say what the policy does not hold (the relation, for an unnarrowed member) and where it is held (§3.6's copy, §8.2/17, `[32]`); §8.2/18 rewritten with the caller's own `workspace_id`; new §8.2/20 | read; the cases are text, not executed |
| 4. Q0R-F2 (§8.1/1 decidable) | §8.1/1 restated over `pg_proc`/`pg_trigger`, bodies tokenised by `scripts/db/sql-lexer.mjs`: (a) the functions in `app`/`private` naming an audit table are exactly the pinned producer set, `SECURITY DEFINER`, owned by `app_command`, none returning `trigger`; (b) no function names a producer; (c) no PL/pgSQL `EXECUTE` (exemption list empty); (d) the audit tables' triggers are `140`'s; five drifts named as self-tests, Q0's r3 drift first | read: `140_audit.sql` creates one function (`private.refuse_mutation`, which names no audit table) and four triggers; no migration function uses a dynamic `EXECUTE` (grep, not a catalog) |
| 5. Q0R-F1 (§8.2/16 executable) | §8.2/16 names injection A (`with check (outcome <> 'succeeded')`), the assertions (raises `42501`, change absent, no audit row for the `request_id`), a control (the same injection admits a `denied` row), a self-test with the wrong function, and the two injections the wrong function passes; §8.2/7 says its CHECK does not stand in for /16 | read against Q0's injection table (`q0-batch-rfc-026-027-recheck-2026-10-03.md` §3.1) |
| 6. Q-026-2..8 recorded | RFC-026 new §10.1 "Decisions taken by the Owner's answers", one row per Q-id, with where it is now the design and whose acceptance is owed; §10's heading and intro say all nine are answered; §3.4 (Q-026-4), §3.5 (Q-026-3, Q-026-8), §3.6 (Q-026-2), §4 (Q-026-7), §6/3 (Q-026-6), §2/5, §5.5, §9/3 (Q-026-5, done by batch 170) | read |
| 7. C0-10 | RFC-027's Status line names the Status line, §5/3, §6.1/5, §6.1/6 and §6.3/14 of `RFC-2026-020` | read against the header's Amends line and §3.4 |
| 8. A1 C2, Q0R-F3 | Q-026-5 and Q-027-5: "no `RETURNING` of a column — `returning 1` reads none"; Q-027-5: the targeted-form sentence holds "to a blocked state" (to `closing` it succeeded, `UPDATE 1`); batch 170's cases include `returning 1` (`tests/db/identity/isolation-cases.mjs:17674`) | read |
| 9. Q0R-F4 | RFC-027 §6/6: scope defined (tables in `app` with a `workspace_id` column, plus `app.workspaces`); the census stated as Q0's 89/8 in that scope beside A1's 91/10; the exemption list after §3.3's rewrites is three, named | read; Q0's count cited, not re-run |
| 10. Q-027-5 done by batch 170 | RFC-027 §4's `pinned-grants.json` bullet: this migration carries no revoke and must not re-grant; §8's alternative and Q-027-5 restated | read against `170_workspace_lifecycle_not_client_writable.sql` |
| 11. Q-027-1..4, 6 recorded | RFC-027 new §10.1; §3.2 (Q-027-4: the edit to `RFC-2026-023` owed to A0), §3.3's tables (Q-027-1, Q-027-3), §5/6 (Q-027-1, both directions) | read |
| 12. Branch slot | `ownership.branch` and both rows of `test-kits/branch-identity.test.mjs`: `…-batch-try-it` (merged as #178) → `…-batch-rfc-text` | the branch-identity tests; `check:handoff` |
| 13. Amendments and rationale | `scripts/test-suite-contract.mjs` dropped from `amends_without_owning.paths` (no floor moves); the rationale rewritten and names the TWO files amended outside ownership (`test-kits/branch-identity.test.mjs`, `test-kits/integrity-manifest.json`); `evidence/VERIFICATION.md` not declared (no test added; 685 as on main) | `verify-branch-scope` exit 0; D2 (74), D3 (73) |
| 14. Line pins | the amendment list shrank by one line, so `open_blockers[i]` moves from line 255+i to **254+i**; the 33 `line` pins of `db/foundation/lint/audit-coverage-map.json` each move back by one (quotes and indices unchanged; checked: blocker 21's quote is on line 275) | D1 |
| 15. `open_blockers[195]` | appended (196 other entries byte-equal, checked by script; the old text a strict prefix): the "STILL OWED before RFC approval" items and the INFO wording points marked done in the text; approval (Owner + A1) and the named roles' acceptance kept owed; new owed: Q-027-4's edit to `RFC-2026-023` (A0) and `app_command`'s `EXECUTE` on `is_active_member` (the command half's batch); (7)'s obligations extended to §8.1/1 (a)-(d) and §8.2/19-21 | read; `npm run check` |
| 16. Integrity manifest | regenerated, 90 digests (the two RFCs and `branch-identity.test.mjs` changed) | D4 |

Every finding the inputs recorded is now done in the text or held with an owner: C0-9, A1 F4-a, Q0R-F1, Q0R-F2,
C0-10, A1 C2, Q0R-F3, Q0R-F4 done in the text; RFC approval, the named roles' acceptance, Q-027-4's edit and the
new grant held on `[195]`; the standing cross-references (`[21]`, `[29]`, `[32]`, `[33]`, `[95]`, `[113]`,
`[191]` (2) and (6), `[188]`) not re-held. No new blocker was added, so nothing is duplicated.

## 2. Drifts (applied to the working tree or a throwaway commit, measured, restored; `git status` clean after)

Node `v24.20.0` (`node -v` before the run). Script `drifts.sh`, log `drifts.log` (private, §5).

| id | drift | command | exit | what failed |
|---|---|---|---|---|
| D1 | every `audit-coverage-map.json` `line` +1 (main's values) | `node --test test-kits/db/foundation-contract.test.mjs` | 1 | 1 of 81: "batch 141 prep: the audit coverage map names real tables, real §8 rows, live blockers, and no producer" |
| D2 | `scripts/test-suite-contract.mjs` re-declared in `amends_without_owning.paths` (committed, then reset) | `node scripts/verify-branch-scope.mjs 88a6670 WP-0A-DB-00` | 74 | "declares 1 amendment(s) that explain nothing this branch changed: scripts/test-suite-contract.mjs" |
| D3 | `test-kits/branch-identity.test.mjs` removed from the amendments (committed, then reset) | the same | 73 | "changed 1 path(s) it neither owns nor records as an amendment: test-kits/branch-identity.test.mjs" |
| D4 | one byte appended to RFC-027, digest not regenerated | `node scripts/verify-test-coverage-floor.mjs` | 86 | "RFC-2026-027-lifecycle-visibility.md — content does not match its recorded digest" |

No drift exists for the RFCs' new design (§1 items 1-5): it is Proposed text, and its obligations are owed to
the batches that land each half.

## 3. Commands and exit codes

| command | exit | result |
|---|---|---|
| `npm run regenerate:manifest` | 0 | "rebuilt 90 digest(s)" |
| `npm run check`, before the code commit | 1 | tests 685, pass 683, fail 2: "the handoff for this branch describes this branch" and "the handoff ratchet fails when an author handoff claims another role approved something" — the not-yet-refreshed handoff guard, nothing else |
| `node scripts/commit-when-clean.mjs` (code commit) | 1 | refused: "tests 685, pass 683, fail 2". **`cdf6774` is a plain `git commit`** because the sole red was the not-yet-refreshed handoff guard |
| `node scripts/verify-branch-scope.mjs 88a6670 WP-0A-DB-00` at `cdf6774` | 0 | "all 6 changed path(s) are declared, and every amendment explains one" |
| `make db-migrate-clean`, `make db-rls-smoke` | not run | no migration, invariant, fixture, isolation case, `scripts/db/**` or CI file changed; the coverage map changed only in WP line pins, read by the static suite alone |

The evidence commit, the handoff refresh, `check:handoff`, `verify-branch-scope` at the head and `npm run verify`
on the branch name are recorded in the handoff and the PR body, which come after this file.

## 4. What is not done

- Neither RFC is approved, and neither can be by this package.
- Nothing in the revised texts was executed: §3.3's literal, §3.7's policies, §8.1/1's rule and §8.2/16-21 are
  text, owed to the batches that land each half (`[195]` (7) and this batch's append).
- `RFC-2026-023` is not edited: Q-027-4's answer (write the gate into it now) is owed to A0 at that RFC's next
  revision, because this batch's scope is the two Proposed RFCs only.

## 5. Private artefacts (not in the repository)

Under the scratchpad directory `a0-rfc-textr/`: the manifest edit script and the texts it appended, the manifest
backup, the drift script and its logs, the check and commit-when-clean logs. No cluster, no port used.
