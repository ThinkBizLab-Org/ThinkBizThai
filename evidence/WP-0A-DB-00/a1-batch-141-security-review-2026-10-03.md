# A1 security review: batch 141 (migration 172, RFC-2026-023 acting-user narrowing, the §11.4 closing command, RFC-2026-026's command half)

- **Package:** `WP-0A-DB-00`. **Role:** independent Security/Privacy reviewer, run `/claude/a1_bastion`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-141` (PR #183, Draft, OPEN, not merged; required check
  `bootstrap` PENDING on the head when read at the end of this run), head `ad97cde`
  (`ad97cde0ec9debb3fc73db1c67f6ada902ee97c9`) over code `76a26e0`, base `e92b896` (main). Author `/claude/a0_atlas`.
- **Checked out as:** local branch `review/a1-batch-141` at `ad97cde`, in this run's own worktree
  (`wf_ddbaaead-e61-3`). For `verify-branch-scope`, `check:handoff` and `verify` I checked out the branch NAME
  `agent/claude/WP-0A-DB-00-batch-141` in the same worktree (`--ignore-other-worktrees`, because worktree
  `wf_ddbaaead-e61-1` holds it; `git rev-parse --abbrev-ref HEAD` printed that name, local and origin refs were both
  `ad97cde`), committed nothing there, and switched back to `review/a1-batch-141` before writing this file.
- **Status:** this file records findings. It advances no status and approves nothing: not batch 141, not
  RFC-2026-023, not RFC-2026-026, not D1-D7 of the disposition, not the migration number 172. It fixes nothing.

## 0. What I am

I am a subagent started by a workflow of `/claude/a0_atlas`, the Author of this batch, of the same vendor and model
family as the Author and as the drafter of RFC-2026-023 and RFC-2026-026. Under RFC-2026-024 that is the stated
independence limit of this role run. Accepting this review as the A1 role's signature is the Integration Owner's and
the Product Owner's act, not mine. Where the plan or blockers name "A1's review" or "A1's acceptance" (D1's number,
D2's step-up point, Q-026-10 (iii)), this file is a findings record about them, not that acceptance.

## 1. Read and measured

**Read:** `CONTRIBUTING_AGENTS.md`; the plan `a0-batch-141-plan-2026-10-03.md`; the disposition
`product-owner-disposition-2026-10-03-batch-141.md`; both commit messages; `git diff e92b896..ad97cde` (all 34
paths; in full: `172_acting_user_and_closing_command.sql`, `scripts/db/audit-producer-rule.mjs`, the 140 replacement
in `invariants/140_audit.1.sql`, the RFC Status lines, the manifest blocker edits, the handoff); RFC-2026-023 §8-§9;
RFC-2026-026 §3.3; `140_audit.sql`'s column and CHECK definitions; CTR-AUD-001's schema for `correlation_id`.

**Measured** (Node `v24.20.0` checked before every run; PostgreSQL 17.11 on `127.0.0.1:5501`, TCP only,
`unix_socket_directories=''`, `initdb --locale=C -A trust -U postgres`, `LC_ALL=C`, the shim first, re-initdb every
round; private directory `scratchpad/a1-141/`; drifts appended to `140_audit.sql` and restored byte for byte, sha1
`2ac2fc2c592be3b5fa7844ce12793093b782a502` before, after every drift and at the end, equal to `e92b896`'s):

| Round | Command | Result |
|---|---|---|
| r1 | `make db-migrate-clean`, `make db-rls-smoke` | exit 0, exit 0; post-migrate pass 53/37/16; audit producer rule "decided each of its 19 drifts and controls"; 1187 isolation cases; `db-authz-proofs` 9 claims |
| r4 | same, fresh cluster | exit 0, exit 0; same counts |
| r2 | migrate-clean, then my attack script P1-P12 (§2) | as §2 |
| d141 | `172_*` renamed `141_*` (restored, `git status` clean) | exit 2: "after batch 171, app_authz holds 3 policies in schema app" (D1's claim, true) |
| dA | drift A: `public.probe_child () inherits (app.audit_logs)` and a writer naming only the child | exit 2, refused by the trigger probe ("append-only table(s) ... inherited from or inheriting") |
| dB | drift B: `create subscription probe_sub ... (connect = false)` | **exit 0: not refused by any probe** (F2) |
| dC | drift C: a `public` view over `app.workspaces`, UPDATE to `app_command`, an unpinned `app_command` definer naming only the view | exit 2, refused by the security definer probe (unpinned) — **not** by part (i) |
| dC2 | drift C without the function: the view and its grant to `app_command` | **exit 0: not refused** (F3) |
| r3 | migrate-clean, restarted with `wal_level=logical`; a second database as publisher | the end-to-end subscription measurement of F2 |
| — | `node scripts/verify-branch-scope.mjs e92b896 WP-0A-DB-00` on the branch name | exit 0, "all 34 changed path(s) are declared" |
| — | `npm run check:handoff` on the branch name | exit 0, "nothing substantive after its cited head" |
| — | `npm run verify` on the branch name | exit 0, tests 688, pass 688, fail 0 |

The cluster was stopped and its data directory removed at the end; port 5501 refused connections afterwards.

## 2. The questions asked

All rows below are measured on r2 (fresh cluster, migrate-clean only, my own committed fixture: workspace A with
owner `a1`, editor `e1`, suspended owner `f1`; workspace B with owner `b1`; six workspaces, one per blocked state,
owned by `a1`). Claims set with `request.jwt.claims` and `role = authenticated` per transaction, as the request tier
would.

### 2.1 Can any client call the closing command for another tenant's workspace, as a non-owner, on a blocked workspace?

- **P1, cross-tenant:** `a1` (aal2) closes B: `denied / workspace.lifecycle.not_permitted`; B stays `active`, 0 audit
  rows in B. **P1b:** B put in `closing`; `a1` cancels it: `denied`, B stays `closing`, 0 rows in B.
- **P2, non-owner:** editor `e1` (aal2) closes A: `denied / not_permitted`, A stays `active`, one `denied` row in A
  under `e1` (correct actor). Suspended owner `f1` (aal2): `denied`, **no** row (not an active member).
- **P3, blocked:** `a1` is active owner of all six blocked workspaces; close and cancel on each: `denied /
  not_permitted` (171's gate inherited through `workspace_member_role`), state unchanged, 0 rows each. (Note: a first
  version selected the ids as `authenticated`, which sees no blocked workspace, so it ran nothing; re-run with literal
  ids.)
- **P4, step-up:** `aal1`, `aal` as `["aal2"]`, `aal` as `"AAL2"`: each `denied / step_up_required`, A unchanged.
- **P10, oracle:** a stranger on A and on a random uuid gets the same `denied / not_permitted`, 0 rows: no existence
  oracle for non-members.

**Answer: no.** Each is refused, state unchanged, and no row is written outside the actor's active membership.

### 2.2 Can a workspace be moved to any state other than closing/active?

Not through the functions: their bodies fix both target states. Through `app_command` itself (reached only by
`postgres`, measured `pg_auth_members`: `app_command` and `app_authz` have no member but `postgres`; `authenticated`
is not a member): **P7** `update ... set lifecycle_state = 'purging'` → `new row violates row-level security policy`
(the WITH CHECK literal); `updated_by` set to another user → refused; `set name` → `permission denied`; app_command
sees 1 workspace (the owner's own), and an UPDATE of B touches 0 rows. `authenticated` holds no UPDATE on
`lifecycle_state` (measured: only `name`, `updated_by`). **Answer: no.**

### 2.3 Can the audit row be forged, suppressed (rollback), misattributed or written cross-tenant?

- **P8:** as `app_command` with `a1`'s claims, a row with `actor_id = b1`, and a `denied` row in B: both
  `new row violates row-level security policy for table "audit_logs"`.
- **P5:** owner closes then `ROLLBACK`: A `active`, 0 rows for that request. **P6:** close then commit: A `closing`,
  one `succeeded` row, actor `a1`, workspace A, business and page null, reason `audit.workspace.closing_started`.
  The action and its row commit together or not at all; the succeeded INSERT sits after the exception block
  (`172:292-309`), so its refusal raises (the proofs /14, /16 and /7 measure the raising path).
- `authenticated` has no INSERT on `app.audit_logs` (measured).
- **Through the request path: forgery, suppression, misattribution and cross-tenant writes are refused.** Outside the
  request path, see F2: a logical-replication subscription writes, rewrites and deletes audit rows past every one of
  these controls, and no probe refuses it.
- The residual RFC-2026-026 §3.3/1 states (a session that can set `request.jwt.claims` and execute a command writes
  as anyone it names; `aal` is read from the same claims) is unchanged and not re-measured on the platform.

### 2.4 Does app_command or the definer function leak rows or widen app_authz?

- The functions return `(outcome, error_code, lifecycle_state)` only; `lifecycle_state` only on success.
- `app_command` reads only `id, lifecycle_state` of the owner's own workspaces; `app.audit_logs` and
  `app.workspace_members` are `permission denied` to it (P7).
- `app_authz` with `a1`'s claims reads 0 rows of `workspace_member_scopes` (a1 has none) and `created_by` is
  `permission denied` (five columns only). `authenticated` is refused EXECUTE on `acting_user_admits_business` and
  `jwt_aal` (P9).
- Functions `app_command` may execute in `app`/`private` (measured): exactly six, all owned by `app_authz`:
  `jwt_subject`, `workspace_member_role`, `is_active_member`, `acting_user_admits_business`,
  `acting_user_admits_page`, `jwt_aal`. The handoff says four (F4).

**Answer: no leak and no widening beyond what RFC-2026-023 §3.2 and §5 name**, inside `app`/`private`. Outside them,
`app_command`'s privileges are not pinned (F3).

### 2.5 Does the §8.1/1 probe catch an unpinned producer, an extension member, a rewrite rule?

Yes, measured in-harness: drifts 1, 2, 3 (unpinned producers, including in `public`, another schema and unqualified),
9 (an extension member of `pgcrypto`), 10 (a non-view rewrite rule and a view naming a producer) are each refused
naming their objects, and the catalog is clean before and after (r1, r4). I read `decideAuditProducerRule` and
`auditProducerRuleStep`: each drift runs live in a rolled-back transaction and the verdict must name every object.
My own drifts: inheritance (dA) is refused by the trigger probe, which part (d) cites. **Not caught: a subscription
(dB, F2), and part (i) through a view (dC/dC2, F3).**

### 2.6 Anything newly opened?

Yes: the first client-reachable write path into `app.audit_logs`, which carries caller-chosen text into an
append-only table (F1). And the review point D2 measured (F5).

## 3. Findings

### F1 — MEDIUM (newly opened). Any active member writes unbounded caller-chosen text into the append-only audit log, flagged redacted

- **Where:** `db/foundation/migrations/172_acting_user_and_closing_command.sql:254-258` and `:345-349` (the only
  check on `request_id`/`correlation_id` is non-blank), `:311-323` and `:400-412` (the refusal row, written for any
  active member, any role, any `aal`), with `secret_redacted, content_redacted, pii_redacted` hard-coded `true`
  (`:322`, `:411`); `140_audit.sql:429-430, 462-463` (text, not-blank only); CTR-AUD-001 (`correlation_id`:
  `minLength 1`, no bound).
- **Measured (P11):** editor `e1` at `aal1` called `app.close_workspace` 200 times with `request_id` of 100,000
  characters and `correlation_id` = an e-mail address, a phone number and a 13-digit ID-shaped number: 200 `denied`
  rows committed (20,000,494 characters of caller text), each with `content_redacted = true, pii_redacted = true`;
  `DELETE` is refused by `private.refuse_mutation` ("app.audit_logs is append-only"). **P12:** an aal2 owner toggled
  close/cancel 50 times: 100 `succeeded` rows, no bound.
- **Why it matters:** before 172 no client could cause any audit row; now every active member can, at will, with
  content the row asserts is redacted. It is a storage-growth lever on a table nothing may delete, a way to plant PII
  where erasure (PDPA) is impossible by design and retention is `retention.audit` (D5, DATA-DEC-06 open), and a
  way to make a support query filtering `correlation_id` (`140_audit.sql:663`) match attacker text.
- **Remedy (forward, in this batch preferably):** bound both identifiers in the command bodies (shape and length,
  e.g. `^[A-Za-z0-9._:-]{1,128}$`, or a uuid) and raise 22023 otherwise; add the same bound as CHECKs on
  `app.audit_logs` in a forward migration (NOT VALID then VALIDATE is unnecessary on an empty table before
  integration); a case per bound; state in RFC-2026-026 §3.4 that a refusal row is caller-triggerable and decide
  whether the server tier rate-limits it. Owner: A0 (172, cases), A1 with DATA-DEC-06's owners (retention).

### F2 — MEDIUM (gap in a newly landed control; pre-existing path). A logical-replication subscription writes, rewrites and deletes audit rows, and no probe refuses one

- **Where:** `scripts/db/audit-producer-rule.mjs:122-127` (part (h) reads `pg_extension` and the four foreign-data
  catalogs, not `pg_subscription`); `:1-3` and `:39` (the claim "nothing else reaches one"); the trigger probe's
  append-only claim (`scripts/db/run.mjs`, unchanged here); RFC-2026-026 §8.1/1 names no subscription.
- **Measured:** dB — `create subscription probe_sub ... with (connect = false, enabled = false, create_slot = false,
  slot_name = none)` appended to 140: `migrate-clean` **exit 0**, every probe green. End to end (r3, `wal_level =
  logical`, a second database `pubdb` with an `app.audit_logs` of the same columns and no policy or trigger, a
  publication, a slot): after a real close (`rX`) and cancel (`rY`), the subscription applied into `postgres`'s
  `app.audit_logs` **a forged `succeeded` row in workspace B under actor `b1`** (`rFORGED`), **rewrote `rX`'s
  `actor_id` to `b1`**, and **deleted `rY`** — past `audit_logs_insert_command`, RLS and `refuse_mutation` (the apply
  worker runs in `session_replication_role = replica`, so ordinary triggers do not fire). Subscription, slot and
  publisher were dropped afterwards.
- **Who can:** a superuser or a member of `pg_create_subscription` — the migration applier's class, the same class
  every §8.1/1 drift assumes. Not reachable by a client. On the Supabase platform whether `postgres` can create a
  subscription is not measured here.
- **Remedy:** extend part (h) (or a separate probe) to refuse any row of `pg_subscription` (and to read
  `pg_publication_rel` naming an audit table, if a reader rule ever needs it), with drift B as its self-test; state
  in RFC-2026-026 §8.1/1 and the trigger probe's text that logical replication bypasses triggers and policies;
  add `pg_create_subscription` membership to the pinned grant probe's role-membership pin. Owner: A0 (`run.mjs`,
  `audit-producer-rule.mjs`), A1 (RFC text).

### F3 — LOW. Part (i) and 172's privilege block see only `app`/`private`, so a view outside them carries the lifecycle UPDATE past the rule

- **Where:** `scripts/db/audit-producer-rule.mjs:203` (part (i) matches the bare name `workspaces` in an
  `app_command`-owned body); `172_acting_user_and_closing_command.sql:500-525` (block 3 asks `app_command`'s
  privileges in `app` and `private` only); the pinned grant probe likewise.
- **Measured:** dC2 — `create view public.probe_ws as select id, lifecycle_state, updated_by from app.workspaces;
  grant select, update on public.probe_ws to app_command;` — `migrate-clean` **exit 0**. dC adds an `app_command`
  definer that updates only `public.probe_ws`: refused, but by the security definer probe because it is unpinned,
  not by part (i). RFC-2026-023 §8/3 (A1 F7) exists precisely for a third function that IS pinned in a reviewed diff;
  pinned, dC's function names no `workspaces` and part (i) admits it. The view is superuser-owned and not
  `security_invoker`, so it bypasses RLS on `app.workspaces` and lets `app_command` set any of the eight states on
  any workspace.
- **Remedy:** extend 172's block 3 (in 172 itself, which is not integrated yet)
  and the pinned grant probe to `app_command`'s privileges on every non-system relation; or make part (i) follow
  `pg_depend` from each `app_command`-owned function to any relation whose rewrite depends on `app.workspaces`.
  Drift C/C2 as the self-test. Owner: A0.

### F4 — INFO. The handoff undercounts `app_command`'s EXECUTE grants

- **Where:** `handoffs/WP-0A-DB-00-author-handoff.json:142` ("EXECUTE on four app_authz helpers").
- **Measured:** six (§2.4). The migration header `172:44-48` and step 2/3 name all six correctly; only the handoff
  sentence is wrong. **Remedy:** correct the sentence at the next handoff refresh.

### F5 — INFO (review point D2, `open_blockers[200]` (4)). The cancel needs no step-up

- **Where:** `172:355-362`. **Measured (P12):** an owner at `aal1` cancelled a `closing` workspace: `succeeded`.
- **Reading:** §11.4 names step-up for `Active --> Closing` only, and the cancel moves toward the less destructive
  state, so D2 is consistent with the approved text. The cost: an attacker holding only an `aal1` owner session can
  keep undoing a legitimate owner's close for as long as the window lasts (DATA-DEC-04, not encoded: any `closing`
  workspace is admitted). I find no reason to block on it; I recommend that DATA-DEC-04's owners decide whether the
  cancel asks `aal2` when the window is encoded, and that the refusal and success rows (already written) suffice to
  detect a cancel war. This is a recommendation, not A1's acceptance of D2.

### Not findings (checked and holding)

- The policy literal `audit_logs_insert_command` is RFC-2026-026 §3.3's verbatim (compared with the RFC block and
  `policy-set.json:61-67`); 140's replacement excepts it by table, name, command, permissiveness and the single
  role `app_command` (`invariants/140_audit.1.sql:207-209`), not by name alone.
- The OUT parameter `lifecycle_state` does not collide with the column in either body (every column reference is
  qualified; the success path is measured).
- `revoke ... from app_command` on its own commands holds: `app_command` cannot execute either (measured list in
  §2.4).
- Inheritance from `app.audit_logs` is refused (dA).

## 4. Claims checked

| Claim (where) | Verdict |
|---|---|
| `141_*` fails `migrate-clean` exit 2 inside 171 (plan §1, disposition D1, commit, `[200]` (1)) | **True**, measured (d141) |
| migrate-clean and rls-smoke green; 53/37/16; 19 drifts and controls; 1187 cases (1129 + 58); 9 proof claims (plan §3, commit) | **True**, measured twice (r1, r4) |
| 688 tests, 685 + 3 (plan §3, `VERIFICATION.md`) | **True** (`npm run verify`: 688/688) |
| `verify-branch-scope`, `check:handoff`, `verify` pass on the branch name (A0's report) | **True**, measured on the name |
| #182 merged at `d756052` as `e92b896`, 2026-10-05T04:00:41Z, run 37260775313 green (disposition §2, commit) | **True** (`gh pr view 182`, `gh run view`) |
| Handoff base moved `921efb5` → `e92b896`; 7 added, 26 modified (handoff commit) | **True** (`git diff --name-status e92b896 76a26e0`: 7 A, 26 M; base `921efb5` at `e92b896`) |
| Blockers appended to [21], [29], [32], [191], [195], [199]; [200] new at the end (A0's report) | **True**: each new string begins with the old one exactly (+697, +419, +491, +641, +1362, +1124 characters); length 200 → 201 |
| Four files amended outside ownership, named in the rationale (A0's report) | **True** (diff of the manifest; `VERIFICATION.md` 685 → 688) |
| Disposition quotes the Owner verbatim and records no new words (A0's report) | True as far as this run can see: each quote matches the earlier dispositions it cites; no new words are claimed |
| "Nothing else reaches" an audit row (`audit-producer-rule.mjs:1-3`, migrate-clean's line) | **Overclaim**: F2 |
| "EXECUTE on four app_authz helpers" (handoff) | **False**: six (F4) |
| "No secret, no PII" (handoff impact) | True of the batch's own fixtures; F1 shows the path it opens can carry PII |
| Draft PR #183 open, not merged | **True**; `bootstrap` PENDING at the end of this run |

## 5. Stop-the-line and merge

**Stop-the-line: none.** No tenant leakage, no secret exposure, no forgeable audit row on the request path, no
migration divergence was found. F2 needs the migration applier's privilege; F3 needs two reviewed DDL changes.

**What blocks the merge, in my reading:** (1) the required check `bootstrap` was PENDING on `ad97cde` at the end of
this run; (2) the C0 and Q0 role runs and the Integration Owner evidence (`open_blockers[188]`); (3) F1 is a newly
opened, client-reachable path into an undeletable table and I recommend it is fixed in this batch, or dispositioned
explicitly by the Owner, before the merge — under the standing delegation "reviews clear" does not hold while it is
open. F2 and F3 may be carried on `open_blockers[200]` with owners if A0 prefers; F4 and F5 do not block.

## 6. Limits

- Same vendor and model family as the Author (§0). Not an acceptance of any RFC, decision or number.
- Measured on a local PostgreSQL 17.11 with the repository's shim, not on the platform: the `aal` claim (Q-023-5),
  function ownership under a non-superuser applier (Q170-c), whether the platform's `postgres` may create a
  subscription (F2), and PostgREST's exposure of `app` are not measured.
- The attack script ran as `postgres` setting `role` and claims per transaction; it models the request tier, it does
  not exercise PostgREST.
- Drift 16 and drift 12 (stated as not built) were not built here either. I did not review the 58 cases one by one;
  I re-measured the classes the questions name with my own fixture.
- `try-it demo` was not run (A0's stated limit, port policy); not re-measured.
