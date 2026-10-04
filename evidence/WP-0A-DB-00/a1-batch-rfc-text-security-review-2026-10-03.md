# A1 security review: batch rfc-text (RFC-2026-026/027 brought in line with the Owner's answers)

- **Package:** `WP-0A-DB-00`. **Role:** independent Security/Privacy reviewer, run `/claude/a1_bastion`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-rfc-text` (PR #179, Draft, open, not merged), head
  `54f5dd0` (`54f5dd023f455c0f33f3cf20b53ce7cbbfb2b324`) over code `cdf6774`, evidence `6489596`, base
  `88a6670` (main). Author `/claude/a0_atlas`. CI on the head: `bootstrap` pass (run 37220551684).
- **Checked out as:** local branch `review/a1-batch-rfc-text` at `54f5dd0`, in this run's own worktree. For
  `verify`, `check:handoff` and branch scope I measured on the branch NAME in a private clone
  (`a1-rfc-text/clone`, since removed): `agent/claude/WP-0A-DB-00-batch-rfc-text` created there at
  `54f5dd0` (`git branch --show-current` printed that name), `origin/main` and `origin/HEAD` = `88a6670`.
  Nothing was committed in the clone.
- **Status:** this file records findings. It advances no status, approves nothing (neither RFC, none of
  the fifteen answers, and not Q-026-9 as the owner of batch `140`), and fixes nothing.

## 0. What I am

I am a subagent started by a workflow of `/claude/a0_atlas`, the Author of this batch, and the same vendor
and model family as the Author and as the drafter of both RFCs. Under RFC-2026-024 that is the stated
independence limit of this role run. Accepting this review as the A1 role's signature is the Integration
Owner's and the Product Owner's act, not mine. Two of the changes reviewed adopt remedies an earlier A1
run wrote (F4-a option (i), C2); on those I am reviewing this role's own earlier advice. A1 is also the
named acceptor of Q-026-1, -2, -4, -9 and the owner of batch `140`; nothing here is that acceptance.

## 1. Read and measured

**Read:** `CONTRIBUTING_AGENTS.md`; the plan `a0-batch-rfc-text-plan-2026-10-03.md`; the disposition
`product-owner-disposition-2026-10-03-batch-rfc-text.md`; the three commit messages `88a6670..54f5dd0`;
`git diff 88a6670..54f5dd0` (both RFCs in full at the head, the manifest, coverage map, branch-identity
test, integrity manifest, handoff); `product-owner-disposition-2026-10-03-batch-rfc-026-027.md` §5, §7,
§8 (the recommendations the Owner's words accepted); `a1-batch-rfc-026-027-recheck-2026-10-03.md` §5;
`RFC-2026-023` §3-§4; `011_authorization_helpers.sql:240-320`; `021_member_scope.sql:389-491`;
`140_audit.sql:362`, `:583-606`, `:685-697`, `:740-741`, `:895`; `scripts/db/run.mjs:425-470`, `:938-960`.

**Measured.** Node `v24.20.0` from `/Users/bank/.local/node-v24.20.0/bin` (`node -v` printed before every
measured run; the PATH Node 26 was not used). PostgreSQL 17.11 from `/opt/homebrew/bin`, one throwaway
cluster on **5501**, `127.0.0.1` only, `unix_socket_directories=''`, `initdb --locale=C -A trust -U
postgres`, `LC_ALL=C`; the shim first, then `make db-migrate-clean` (exit 0, "ok"). Both prototypes ran
inside one transaction each and were ROLLED BACK; no migration file was edited, so nothing needed
restoring. The cluster was stopped and its data directory removed; port 5501 has no listener after.
`make db-rls-smoke` was not run: nothing a DB layer reads changed (confirmed: the diff touches no
migration, invariant, fixture, isolation case, `scripts/db/**` or CI file).

| command | where | exit | result |
|---|---|---|---|
| `node scripts/verify-branch-scope.mjs 88a6670 WP-0A-DB-00` | clone, branch name | **0** | "all 9 changed path(s) are declared, and every amendment explains one" |
| `npm run check:handoff` | clone, branch name | **0** | "describes the branch: nothing substantive after its cited head" |
| `npm run verify` | clone, branch name | **0** | "clean: exit 0 — tests 685, pass 685, fail 0, skipped 0, todo 0" |
| `make db-migrate-clean` | 5501 | **0** | "post-migrate pass: 51 apply-time blocks, 39 re-run as written, 12 superseded and replaced" |
| prototype 1 (§2) | 5501 | 0 | 26 rows, below |
| prototype 2 (§4) | 5501 | 0 | below |
| manifest/coverage/integrity comparison script, base vs head | worktree | 0 | below (§5) |

## 2. Prototype 1: RFC-2026-026 §3.3's revised literal and §3.7's command policy, executed

Setup (rolled back): workspaces WA and WB, business BA/BB, pages PA1, PA2 (under BA) and PB1 (under BB).
Users U (owner of WA, no scope row), S (suspended in WA), MB (active in WA, `business` scope on BA),
MP (active in WA, `page` scope on PA1). `RFC-2026-023`'s two helpers do not exist, so stand-ins answered
exactly as its §3.2 says (active member AND no scope row or one covering, with batch 021's `covers_*`
reading, filtered by the claims' subject). The grants of §9/1, the policy of §3.3 verbatim, §3.7's
command policy verbatim, and a stub producer owned by `app_command`, `SECURITY DEFINER`, `search_path=''`,
`EXECUTE` to `authenticated` only, writing the row it is told with the actor from the claims.

| case | row | result |
|---|---|---|
| P1 / P2 | U, `denied` / `failed`, `workspace_id` = WB (another tenant) | refused 42501 (RLS) |
| P3 | U, `denied`, a `workspace_id` no workspace has | refused 42501 |
| P4 | U, `succeeded`, WB | refused 42501 |
| P5 (control) | U, `denied`, WA, no scope | **admitted** |
| P6 | S (suspended), `denied`, WA | refused 42501 |
| P7 | claims with a null `sub` | refused 42501 |
| R1 / R2 / R3 | U, `denied` in WA naming BA / BB / only PA1 | refused 42501 each |
| G1 (control) | MP, `succeeded` WA/BA/PA1 (in scope) | **admitted** |
| G2 | MP, `succeeded` WA/BA/PA2 (out of scope) | refused 42501 |
| G3 | MP, `succeeded` WA/BA/PB1 (another tenant's page) | refused 42501 |
| G4 | U, `succeeded` WA, page PA1, business null | refused 42501 |
| G5 / G6 | U (unnarrowed), `succeeded` WA/BA/PB1 and WA/BB/PB1 | **admitted** (stated by §3.3/3) |
| G7 | MB (`business` scope on BA), `succeeded` WA/BA/**PB1** | **admitted** (F3) |
| G8 | MB, `succeeded` WA/BB, no page | refused 42501 |
| E1 (control) | security event, U's own actor, WA | **admitted** |
| E2 / E3 / E4 / E5 | U's actor in WB; another actor in WA; no actor; a non-existent workspace | refused 42501 each |
| N1 | P5 again with the command policy dropped | refused 42501 (negative control) |

## 3. Answers to the questions put to this run

**Does membership for every command row close the cross-tenant denied-row write (Q-026-1)?** Yes, as
written and as executed: P1-P4 and P3 (another tenant's and a non-existent `workspace_id`, every outcome)
are refused, the own-workspace control P5 is admitted, and the negative control N1 shows the policy is
what admits it. This holds under the assumption §3.3/1 already states: the request tier owns
`request.jwt.claims`. A session that can set that setting and execute a command function writes as any
user, member of whatever that user is a member of; the membership term adds nothing against that, and
§3.3/2's "no client, through any command" is true only with that qualifier (F4, INFO). The term's cost is
F1: the refusal it removes is now recorded nowhere, which is not what the Owner's accepted recommendation
said.

**Is the `security_events` producer rule sound?** The command policy is sound for isolation (E1-E5). The
worker policy was not executed (no worker identity exists, `RFC-2026-022` §5/8) and is, as §3.2 says,
containment and not isolation. Two observations: the rule makes Q-026-1's accepted destination for a
non-member refusal unreachable (F1), and the worker arm admits a `system_actor` event with any non-blank
`actor_id`, a user's uuid included (F5, INFO).

**Does §3.3 now refuse another tenant's page?** Only for a member narrowed by a `page` scope (G3). For an
unnarrowed member (G5, G6) the RFC says so itself. For a member with a `business` scope, or an
`all_businesses` one, a `succeeded` row in the caller's own workspace naming a business of its scope and
**another tenant's page** is admitted (G7), and the text does not say so (F3, LOW). Refusal rows can name
no scope at all (R1-R3), so F4-a's denial-row half is closed. In every case the row stays in the caller's
own workspace, under the caller's own actor; the relation for `succeeded` rows is held only by §3.6's
copy-from-`RETURNING` and §8.2/17, as Q-026-2's answer says.

**Is anything newly opened by the text?** Nothing that widens a write path: the membership term and the
no-scope refusal arm both narrow what the earlier literal admitted, `EXECUTE` on `app.is_active_member`
for `app_command` adds a caller-only oracle to a role reachable only through definer functions that
`authenticated` already calls it from, and the security-events command arm admits only the caller's own
actor. What is newly *lost* is a record (F1). What is newly *stated but not held* is §8.1/1's schema scope
(F2).

## 4. Prototype 2: what §8.1/1 (a)-(d) read

§8.1/1 (a)-(c) read functions "in schemas `app` and `private`". Prototype (rolled back): the §3.3 policy
and grants as in §2; a table `app.probe_target` the stub command inserts into; on it, two `AFTER INSERT`
triggers whose functions are `SECURITY INVOKER` and live **outside** `app`/`private`:
`public.probe_audit_from_trigger()` (`search_path=''`, names `app.audit_logs`) and
`probe_x.probe_audit_unqualified()` in a new schema (`set search_path = app`, names `audit_logs`
unqualified). As `authenticated` with U's claims, one call of the command:

- both triggers ran as `app_command` and wrote a `succeeded` audit row each, admitted by §3.3's policy
  (`role.from_trigger`, `role.from_trigger2`, actor U) — a trigger producer, which §3.1 says never exists;
- (a) as written (functions in `app`/`private` naming `app.audit_logs`; a regex stood in for the lexer)
  selected **nothing**; the same query over every non-system schema and matching the unqualified name
  selected both;
- (d) still read exactly `140`'s four triggers (`refuse_mutation`, `refuse_truncate` on each table), so it
  does not see a trigger on another table either.

## 5. Claims checked

| claim | where | verdict |
|---|---|---|
| `open_blockers[195]` appended, the 196 other entries unchanged, old text a strict prefix | plan §1/15, commit `cdf6774`, handoff | **true** (197 entries both sides; only index 195 differs; prefix true; +3640 chars) |
| only `ownership` and `open_blockers` change in the manifest; branch slot `…-batch-try-it` → `…-batch-rfc-text`; `scripts/test-suite-contract.mjs` dropped from the amendments, two remain | plan §1/12-13 | **true** |
| the 33 `line` pins of `audit-coverage-map.json` each move back by one, nothing else changes, quotes on their lines | plan §1/14 | **true** (33 diffs, all `.line` −1; 33/33 quotes found, one only after JSON unescaping) |
| integrity manifest 90 digests; the two RFCs and `branch-identity.test.mjs` changed | plan §1/16 | **true** (90/90; exactly those three) |
| both Status lines still say Proposed; §10.1 of each says the answers are not an approval | plan, disposition, commits | **true** |
| `EXECUTE` on `app.is_active_member` held by `authenticated` today | RFC-026 §3.3, `011:320` | **true** |
| `140` creates one function and four triggers on the audit tables; no migration uses dynamic `EXECUTE` | plan §1/4 | **true** (`140:362`, `:685-697`; grep, not a catalog) |
| `returning 1` case at `isolation-cases.mjs:17674` | RFC-027 Q-027-5, `[195]` | **true** (`returning 1`, expect denied by grant) |
| `service-policy-map.json:138` holds the denial wording quoted in §3.3/4 | RFC-026 | **true** |
| #178 merged at `a0965f7` as `88a6670`, 2026-10-04T16:48:40Z, run 37217282992 success on that head | disposition §3 | **true** (`gh`) |
| `verify-branch-scope` 0, `check:handoff` 0, `verify` 0 with 685 tests | handoff | **true** (§1) |
| §10.1 Q-026-1 and Q-026-4 rows record the answers as accepted | RFC-026 `:638`, `:641` | **not as accepted** — F1 |
| `security_privacy_cost_impact`: "no client writes into another tenant's log" | handoff | true under the claims assumption only — F4 |

The plan's drifts D1-D4 were not re-run by me (they are Q0's to re-check).

## 6. Findings

Grades: CRITICAL / HIGH / MEDIUM / LOW / INFO. **None is stop-the-line**: nothing in this batch is
executable, no grant, policy, role, migration or CI file changed, and the measured gaps are in Proposed
text.

| id | grade | finding | where | remedy, and owner |
|---|---|---|---|---|
| F1 | **MEDIUM** (record; read, and the consequence measured by E2) | The batch records as the Owner's answer something the Owner's accepted recommendation did not say. The recommendation the Owner's `ลุยต่อเลย เอาตามแนะนำ` took for Q-026-1 (disposition rfc-026-027 §7, read in §8) routes a refusal about a workspace the user cannot reach **to `app.security_events` once Q-026-9 gives it a producer**, held with Q-026-4 only *until then*. The accepted Q-026-9 recommendation gives the command a producer there only in a workspace the actor is an active member of, so that route can never exist. The two accepted recommendations contradict each other, and the text resolves the contradiction silently toward less recording: §3.3/4 and §3.7 say the refusal "has no producer in either table", §10.1's Q-026-1 row says it "is not recorded, beside Q-026-4", and §10.1's Q-026-4 row extends the accepted gap to "refusals about a workspace the user cannot reach" — a class Q-026-4's accepted answer (refusals that *never reach a producer*) did not name, since these reach one. The lost record is the security-relevant one: a user attempting commands against another tenant's or a non-existent workspace id leaves no trace anywhere until SEC-014's producer, after G1. Neither the plan, the disposition, `[195]` nor the handoff mentions the contradiction | `RFC-2026-026:182-191`, `:303-305`, `:638`, `:641`; disposition rfc-026-027 §7 Q-026-1 row | Before merge, since recording the answers faithfully is this batch's purpose: state in §10.1 (and `[195]`) that Q-026-1's accepted route and Q-026-9's accepted predicate conflict, that "not recorded" is A0's reconciliation and not the Owner's answer, and put it back as a question to A1 (Q-026-4/Q-026-9's owner) and the Owner. Options for that question: (i) the command writes a security event in a workspace the actor *can* reach (or in a platform-scope store, `[191]` (7)) naming the attempted id; (ii) accept the gap explicitly as a new class beside Q-026-4. A0 writes; A1 and the Owner decide |
| F2 | **MEDIUM** (design; measured on a prototype, §4) | §8.1/1, the static form of answer B, reads functions in `app` and `private` only. An `SECURITY INVOKER` trigger function in `public`, in a new schema, or (by the repository's own history) in a system schema above `FirstNormalObjectId`, attached to any table a producer writes, runs as `app_command` (or `app_worker`) and writes an audit row the producer's policy admits; (a), (b) and (c) never read it and (d) reads only triggers on the audit tables. The same holds for a function naming `audit_logs` unqualified under a `set search_path` that reaches `app`: (a)'s "names `app.audit_logs`" does not say an unqualified name counts. This is the schema-by-name scope `scripts/db/run.mjs:439-463` and `:944-948` record being bypassed three times (A1 F2/F3, A1 N1/C0 N1/Q0 N1, C0 F1/Q0 F1) and replaced by "every non-system schema, and every object at or above 16384" | `RFC-2026-026:465-482` | Before RFC-026 is approved: restate (a)-(c) over every function the migrations make, in any schema (`NON_SYSTEM_SCHEMA` or OID ≥ 16384, as `userObject` does), and say that a name resolved through `search_path` — an unqualified `audit_logs`/`security_events` or a producer's bare name — counts as naming it (or forbid any function setting a `search_path` other than `""`). Add (e): no trigger on any table calls a function that (a)-(c) select. Add both drifts above to the five self-tests. A0 writes; Q0 checks the drifts |
| F3 | **LOW** (design; measured, G7) | §3.3/3 says the scope helpers are "true for any id" for an **unnarrowed** member. They are also true for a page id of another tenant whenever the member's scope is `business` (the page form admits every page under a covered business, by id alone, `021:448-450`) or `all_businesses`. So the policy refuses another tenant's page only for a `page`-scoped member; §8.2/20 tests only that case and would pass with this gap open. Impact as F4-a: confined to the caller's own workspace log and actor | `RFC-2026-026:173-181`, `:573-577` | When next edited: say in §3.3/3 that the policy refuses a foreign page only for a page-scoped member, and that for unnarrowed, `all_businesses` and `business`-scoped members the relation is §3.6's and §8.2/17's alone; make §8.2/17 cover a page argument that names another tenant's page under a business the member's scope covers. A0 |
| F4 | **INFO** (read) | §3.3/2 ("no client, through any command, writes into another tenant's log") and the handoff's `security_privacy_cost_impact` state the membership term's effect unconditionally. It holds only while the request tier alone sets `request.jwt.claims` (§3.3/1's residual, §8.1/6) | `RFC-2026-026:166-172`; handoff | Qualify the sentence with §3.3/1's assumption. A0 |
| F5 | **INFO** (read) | §3.7's worker arm (`actor_kind is null or actor_kind = 'system_actor'`) bounds the kind, not the id: a defective worker can record a `system_actor` event whose `actor_id` is a user's uuid, which reads as attribution. `140`'s CHECKs require only non-blank | `RFC-2026-026:298`; `140_audit.sql:601-606` (the actor CHECKs) | For A1 as `140`'s owner when Q-026-9 is accepted: decide whether a `system_actor` id has a form (for example a dotted name, as `140`'s probe uses `migration.140.probe`) and pin it with the worker half. No action in this batch |
| F6 | **INFO** (read) | Once `RFC-2026-027` lands, `is_active_member` refuses blocked workspaces, so no command can audit an act on a workspace in any of the six blocked states; such an act cannot happen through a command at all (fail-closed). That matches §11.4 (no member act in those states) and §8.2/19 says so; a future support or restore command on a blocked workspace would need the worker producer | `RFC-2026-026:166-172`, `:568-572` | None now; recorded so the first such command is designed against it |

## 7. Stop-the-line and merge

**Stop-the-line: no.** No secret, tenant leak, lost job, migration divergence or contract mismatch is in
the diff; both RFCs stay Proposed and nothing is executable. The gates measured on the branch name are
green (§1) and CI is green on the head.

**Merge:** F1 should be corrected before the merge: this batch exists to record the Owner's answers in the
RFC text, and §10.1 currently records, as the Owner's answer, a reconciliation the Owner did not see and
that removes a security record the accepted recommendation kept. It is a text correction (§10.1's two
rows, §3.3/4, §3.7's last paragraph, `[195]`), not a redesign. F2 and F3 must be resolved before RFC-026
is **approved**; they do not need to block this merge. F4-F6 are informational.

## 8. Limits

- Both prototypes ran on PostgreSQL 17.11 locally, with stand-ins for `RFC-2026-023`'s helpers (which do
  not exist) and a stub producer; they show what the policy text admits, not what a landed command does.
  The worker policies were not executed.
- §8.1/1's rule was approximated with a regex over `prosrc`, not the repository's lexer; the finding is
  about which schemas and which name forms the text tells the rule to read, which the lexer does not change.
- I did not re-run the plan's drifts D1-D4, re-count RFC-027 §6/6's 89/8 census, or review the RFC-027
  design beyond this batch's edits (wording, scope, `[195]`, §10.1), which change no SQL.
- Same vendor and model family as the Author (§0).
