# A1 security review: batch rfc-023-028 (RFC-2026-023 brought current, RFC-2026-028 drafted)

- **Package:** `WP-0A-DB-00`. **Role:** independent Security/Privacy reviewer, run `/claude/a1_bastion`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-rfc-023-028` (PR #182, Draft, OPEN, not merged), head
  `b0adf6b` (`b0adf6b51299d57e6d8c010c31d13bf6e6bc474b`) over code `1da0b1c` and evidence `3d21389`, base
  `921efb5` (main). Author `/claude/a0_atlas`.
- **Checked out as:** local branch `review/a1-batch-rfc-023-028` at `b0adf6b`, in this run's own worktree
  (`wf_94b46ca9-189-3`). For `verify-branch-scope`, `check:handoff` and `verify` I checked out the branch NAME
  `agent/claude/WP-0A-DB-00-batch-rfc-023-028` in the same worktree (`--ignore-other-worktrees`; `git rev-parse
  --abbrev-ref HEAD` printed that name; the local and remote refs were both `b0adf6b`), committed nothing
  there, and switched back to `review/a1-batch-rfc-023-028` before writing this file.
- **Status:** this file records findings. It advances no status and approves nothing: not the batch, not
  RFC-2026-023, not RFC-2026-028, not any Q-023-* or Q-028-* answer, not the role's name, not a migration
  number. It fixes nothing.

## 0. What I am

I am a subagent started by a workflow of `/claude/a0_atlas`, the Author of this batch, of the same vendor and
model family as the Author and as the drafter of both RFCs. Under RFC-2026-024 that is the stated
independence limit of this role run. RFC-2026-028 names A1 as DATA-DEC-03's co-owner and asks for "A1's
review"; this file is a findings record from a role run, not the co-owner's acceptance. Accepting it as the
A1 role's signature is the Integration Owner's and the Product Owner's act, not mine.

## 1. Read and measured

**Read:** `CONTRIBUTING_AGENTS.md`; the plan `a0-batch-rfc-023-028-plan-2026-10-03.md`; the disposition
`product-owner-disposition-2026-10-03-batch-rfc-023-028.md`; the three commit messages; `git diff
921efb5..b0adf6b` (both RFCs in full, the manifest's branch/writable/amendment fields, `open_blockers[113]`,
`[195]`, `[199]` compared to main by prefix, the 33 line pins, the registration rows, the handoff); and the
sources the RFCs cite: migrations `001`-`003`, `010` (workspaces, workspace_members), `011` (`jwt_subject`,
`workspace_member_role`, `is_active_member`, app_authz's policy :211-216, grants :298-320), `021` (:208-252,
:326, :389-470, :505-507, :533-557), `022` (:32, the deliberately unclosed `workspace_member_scopes`), `050`
(:420-430, :488-512, :600-612), `102` and `127` (the restrictive INSERT policies on `workspace_member_scopes`),
`db/foundation/test-helpers/auth-context.sql:95-108`, and `scripts/db/run.mjs` (:619-642, :1340, :1354,
:1455-1466, :3700-3830).

**Measured** (Node `v24.20.0` checked before each run; scripts and logs in the private directory
`a1-rfc-023-028/`, not committed):

| command / probe | result |
|---|---|
| `node scripts/verify-branch-scope.mjs 921efb5 WP-0A-DB-00` on the branch name | exit 0: "all 11 changed path(s) are declared, and every amendment explains one" |
| `npm run check:handoff` on the branch name | exit 0: "describes the branch: nothing substantive after its cited head" |
| `npm run verify` on the branch name | exit 0: "tests 685, pass 685, fail 0, skipped 0, todo 0" |
| `gh pr view 181`, `gh run view 37245602888`, `git log -1 921efb5` | merged 2026-10-05T00:15:42Z at head `d99d22c`; run `Bootstrap validation` success on `d99d22c`; `921efb5`'s parents `700715e`, `d99d22c` |
| `gh pr view 182` | Draft, OPEN, head `b0adf6b` |
| blockers vs main, by prefix | only `[113]` and `[195]` changed, each a strict append; `[199]` new at the end (200 entries, main 199) |
| line pins | 33 pins; `open_blockers` key on manifest line 256; every quote found on its pinned line (index 21 → line 278 = 257+21) |
| integrity manifest | 91 digests; RFC-2026-028 in `DECISION_RECORDS` (`repository-json.test.mjs:125`) and `DIGESTED_FLOOR` (`verify-test-coverage-floor.mjs:459`) |
| `grep -rl audit-coverage-map` over `scripts tests test-kits db/foundation/ci Makefile .github` | only `test-kits/db/foundation-contract.test.mjs` (A0's reason for not running the DB layer holds) |

**Live, on port 5501 only** (`/opt/homebrew/bin`, PostgreSQL 17.11, `initdb --locale=C -A trust -U postgres`,
`LC_ALL=C`, TCP only with `unix_socket_directories=''`, the shim first, re-initdb every round; five rounds).
Nothing the DB layer reads changed in this batch, so these are **prototypes of what the RFCs propose and
drifts against today's probes**, not a re-measurement of the batch. Every drift was appended to
`db/foundation/migrations/140_audit.sql` and restored byte for byte (sha256 `2ac596bb…c1ad37149` before and
after each); `git status` clean at the end; cluster stopped and removed; nothing listening on 5501.

| round | what | result |
|---|---|---|
| R0 | `make db-migrate-clean`, then RFC-2026-028 §3.1's two statements typed by hand as the superuser `postgres` | migrate-clean exit 0. Members of `app_worker_login`: **none**. Its one membership: `app_worker`, admin f, inherit f, set t. `has_schema_privilege(…, 'app', 'USAGE')` **f** (`app_worker`'s own: t); `private` f; `auth` f; `public` **t** (PUBLIC's). `pg_authid.rolpassword is null`: t |
| R0 | the same as a **non-superuser** `CREATEROLE` owner (`sim_owner`, as `postgres` is on the provisioned instance), `createrole_self_grant` empty | members of the new role: **`sim_owner`, admin t, inherit f, set f, grantor postgres** (F1) |
| R0 | connected AS `app_worker_login` (trust) | §5/7: `select … from app.workspaces` → `42501 permission denied for schema app`. §5/8: `set local role` `app_command`, `app_maintenance`, `authenticated`, `postgres` → each `42501 permission denied to set role`. `set local role app_worker`: `current_user` app_worker, `session_user` app_worker_login. §5/10: `app.workspaces` → **0 rows** through the worker, **1** through `postgres`. §5/9: after `commit`, `current_user` app_worker_login; negative control, plain `set role app_worker` → still `app_worker` after commit. **A session-level `set_config('app.workspace_id', …, false)` is still set in the next transaction** (F4) |
| R0 | `pg_hba.conf` line `host all app_worker_login 127.0.0.1/32 scram-sha-256` prepended, reload | §5/12: no password → `fe_sendauth: no password supplied`; any password → `password authentication failed for user "app_worker_login"`. Under the cluster's `trust` lines the same role logged in with no password (F8) |
| DA | drift: §3.1's role and grant appended to `140` | migrate-clean exit 2: pinned grant probe, "role membership(s) of a non-superuser role not pinned …: app_worker_login -> app_worker" |
| DB | drift: a `LOGIN` role with no membership | exit 2: "a non-superuser role holds an attribute pinned false …: app_worker_login rolcanlogin" |
| DC | drift: a `NOLOGIN` role with `alter role … set role = 'app_worker'` and `set search_path = app` | **exit 0: not caught today**, as RFC-2026-028 §3.6 says ("settings rule: client roles only") |
| R1 | RFC-2026-023 §3.2 prototyped as written (business form; five-column grant, the `app_authz` policy, helper owned by `app_authz`, EXECUTE to `app_command`) | every call as `app_command` → **`42501 permission denied for schema app`**: `app_command` holds no `USAGE` on `app` (F5) |
| R2 | the same plus `grant usage on schema app to app_command` | scoped member A: B1 **t**, B2 **f**. Unscoped member B: B2 **t**. Non-member: **f**. No claims: **f**. A on B1 by lifecycle state: `active` t, `closing` t, `access_blocked`/`purge_queued`/`held`/`purging`/`verify`/`deleted` **f** each. `authenticated` and `app_worker` → `42501 permission denied for function`. Negative control: policy dropped → A on B2 **t** (the vacuous shape §0/7(b) names) |

## 2. The questions asked of this review

**Can the worker identity be used by a client or a compromised web tier?** Not by a client: the role is
reachable only by logging in with its credential; `authenticator` is not a member (and RFC-2026-028 §3.6
extends the negative to the role); a JWT `role` claim naming it would need that membership; the login role
cannot `SET ROLE` to `authenticated` or to any role but `app_worker` (measured, R0). A compromised web tier
can use it **only if it can read the credential**, and the RFC's custody section does not say it must not
(F3).

**Does it bypass RLS anywhere?** No, measured: under `set local role app_worker` the worker read zero rows of
a table where `postgres` read one (the §5/10 pair); before `SET LOCAL ROLE` it cannot use `app` at all. Its
reach before the preamble is PUBLIC's (it holds `USAGE` on `public`, measured), which the client privilege
probes already bound because every PUBLIC privilege is also `anon`'s.

**Is credential custody sound?** In the repository, yes: the migration creates the role with no password
(measured inert under `scram-sha-256`), no secret is written by this batch (secret scan in `verify`, green),
and the test credential is generated per cluster. On the provisioned instance, three gaps (F1, F2, F3): the
migration owner holds `ADMIN` on the role there and so can reset its credential; nothing re-reads the role's
topology where the out-of-band steps happen; and the secret's scope is not separated from the request tier.

**Do the existing probes catch a mis-provisioned worker?** On the migrate-clean catalog, yes for membership
and attributes (DA, DB), no for role settings (DC, as the RFC itself says), and a re-grant `with admin
option` or `with inherit true` would pass once the pin admits the membership until Q-028-10 is done. On the
provisioned instance, mostly no (F2).

**RFC-2026-023: can a command serve a user outside their scope, including a blocked workspace?** Not through
the helpers as revised, measured on a prototype (R2): out-of-scope business false, non-member false, no
claims false, every one of `RFC-2026-027`'s six blocked states false, `closing` admitted as `active`. The
gate is inherited because the helper calls `app.is_active_member`. The residual is the one §4 states (a
session that can set `request.jwt.claims` and execute a command function acts as anyone it names), plus F7.

## 3. Findings

Graded for what they would do if built as written. None is live: no role, grant, policy or credential exists.

**F1 — MEDIUM (design). On the provisioned instance the role will have a member, and §4/1's apply-time
assertion "nothing a member of it" will be false there.** `RFC-2026-028-worker-identity.md:95` ("Nothing is
a member of it") and `:236-237`. The platform's migration owner `postgres` is not a superuser
(`scripts/db/run.mjs:3821`, `KNOWN_SUPERUSERS = ['supabase_admin']`), and a non-superuser that creates a role
is granted `ADMIN` on it (R0: `sim_owner`, admin t, inherit f, set f, grantor `postgres`). The repository
already recorded this for `app_worker` (`002_service_role_assumption.sql:7-9`). Locally the creator is a
superuser, gets no such row, and the assertion passes; on the platform it either fails the migration or was
written so that it can never fire. The row also means anyone holding `postgres`'s credential can set the
worker's password. **Remedy:** §3.1 and §4/1 name the expected creator row (the migration owner, admin t,
inherit f, set f) as the one admitted member on an instance whose owner is not a superuser, and assert its
options; §3.3 records that the migration owner's credential can mint the worker's.

**F2 — MEDIUM (design). Nothing reads the worker's topology on the instance where it is provisioned.**
`RFC-2026-028-worker-identity.md:226-231`. The fourth rule, the eighth rule, the settings rule and the
`authenticator` negative run against the migrate-clean catalog. The snapshot rules for the provisioned
instance (`run.mjs:3787-3810`) read only bypass, superuser, password, `private` usage and the admin role's
SET/INHERIT for the service roles; the RFC's table extends exactly those to the login role. But every step
§3.3/2 takes out of band — the verifier, rotation — happens only on the provisioned instance, where an
operator's `grant app_maintenance to app_worker_login`, `alter role app_worker_login inherit`, `alter role …
set role = 'app_worker'`, or a grant of the login role to another role would be read by no rule. The snapshot
is also a point-in-time read. **Remedy:** the snapshot carries the login role's attributes, memberships with
their three options, its members, its `pg_db_role_setting` rows and its connection limit, and the snapshot
lint asserts §3.1 against them; the custody runbook re-takes the snapshot after each credential change.

**F3 — MEDIUM (design). Custody does not separate the credential from the request tier.**
`RFC-2026-028-worker-identity.md:140-147`, Q-028-3 (`:336`). The text says the plaintext lives in the
platform's secret store and reaches "the worker process"; it does not say which runtimes may read that
secret scope. If the worker and the web tier share a deployment or an environment-variable scope, a
compromised web tier holds a cross-tenant service identity, which is exactly the reach the role's confinement
exists to deny. The production secret's strength is also unstated (only the test credential's 32 bytes are),
and a SCRAM verifier that reaches a statement log is crackable offline in proportion to that. **Remedy:** add
to §3.3/2 and to Q-028-3's condition: the credential's secret scope excludes every request-path runtime; the
production secret is generated with at least the test credential's entropy; network restriction (`pg_hba` or
the platform's equivalent) to the worker's egress is considered and recorded either way.

**F4 — LOW (test obligation). A session-level `app.workspace_id` survives into the next job.**
`RFC-2026-028-worker-identity.md:97-100` and §5/9 (`:280-282`). The prose forbids non-`LOCAL` settings, but
the only negative control is for `set role`. Measured (R0): `set_config('app.workspace_id', …, false)` in one
transaction is still set in the next on the same connection, so a job that forgets to set its workspace runs
with the previous job's, and a CARRIED policy reading the setting admits it. Under a transaction-mode pooler
the next transaction may be another worker process. `RFC-2026-022` §5/4 already says the setting is
containment, not isolation, so this is a missing case, not a broken boundary. **Remedy:** a §5 case and
negative control: the worker harness refuses to start a transaction whose `app.workspace_id` is already set,
and the same case with `set_config(…, false)` goes red; the pooler's reset behaviour joins Q-028-12.

**F5 — LOW (cost list). `app_command` needs `USAGE` on schema `app`, which moves the seventh rule's pin, and
RFC-2026-023 does not list it.** `RFC-2026-023-acting-user-narrowing.md:26` and `:121` list the pins that
move and omit `PINNED_SCHEMA_PRIVILEGES` (`run.mjs:1354`: `app_authz`, `app_worker`, `authenticated` only).
Measured (R1): every call of the prototype helper as `app_command` failed `42501 permission denied for schema
app`; with the grant (R2) it worked. It fails closed, so it is not a security defect, but the RFC says its
list is the implementing batch's checklist. **Remedy:** add "`app_command USAGE on app`, the seventh rule" to
§5's pins and §0/6's last column.

**F6 — LOW (accuracy). The `app_authz` policy is wider than the policy it is said not to exceed.**
`RFC-2026-023-acting-user-narrowing.md:84` ("no wider than `workspace_member_scopes_select_own`") and the
handoff's `security_privacy_cost_impact` ("no wider than authenticated holds"). `select_own` is `user_id =
auth.uid() and app.is_active_member(workspace_id)` (`021_member_scope.sql:534-539`); the proposed policy drops
the second conjunct, so `app_authz` sees the acting user's scope rows in workspaces where the user is not
admitted, blocked ones included. No exposure follows, because the policy is reachable only inside
`app_authz`-owned helpers that ask `is_active_member` first (R2: blocked states false), and Q-023-8
(`:179`) argues exactly that. **Remedy:** reword §3.2 to "the acting user's own rows, without the membership
conjunct, which the helper asks", or add the conjunct; the handoff's sentence corrected likewise.

**F7 — LOW (design). The closing command's power is the role's, not the function's.**
`RFC-2026-023-acting-user-narrowing.md:161` (§8/2). `UPDATE (lifecycle_state, updated_by)` on
`app.workspaces` and the `FOR UPDATE TO app_command` policy apply to every function `app_command` owns, so a
later command function with a defect could move an owner's workspace between `active` and `closing` without
the step-up the closing function's body checks. §4 says shape B is containment against defects in command
code; here the containment is the body digest pin (`RFC-2026-026` §8.1/1), which makes such a function arrive
in a reviewed diff but does not refuse it. **Remedy:** for Q-023-5's batch, a static rule that only the two
lifecycle functions' bodies write `app.workspaces`, or a dedicated owner role for lifecycle commands;
recorded with a drift.

**F8 — INFO (accuracy). "Inert on every instance" holds only where every `pg_hba` line reaching the role
asks for a password.** `RFC-2026-028-worker-identity.md:134-136`. Measured both ways (R0): refused under
`scram-sha-256`, logged in under `trust`. §3.3/3 already says this of the CI and local clusters; §3.3/1's
sentence should carry the same scope.

**Confirmed, not findings:** RFC-2026-028 §2's citations (`003:26`, `run.mjs:640`, `:1340`, `:1354`,
`:1457-1465`, `:3718`, `:3816`, `050:426-427`, `:490-510`, `:608`, `auth-context.sql:95-108`); §3.1's claims
and §5/7-10 and §5/12, executed (R0) — A0's stated limit `open_blockers[199]` (6) is now partly measured by
this run but stays owed to the implementing batch, whose own run must execute them; RFC-2026-023 §0/7's
two corrections (`021:326` forced; `scope_type` read at `021:415-450`) and the vacuous-shape negative control
(R2); finding (4) on `app.jobs` (`050` stores no `actor`, `request_id` or `correlation_id`) agreed at MEDIUM
for the design; `022:32` leaves `workspace_member_scopes` without a shape-C closure, so the proposed
permissive `app_authz` policy is not cancelled by a restrictive one.

## 4. Claims checked

| claim (where) | verdict |
|---|---|
| three commits, code `1da0b1c`, evidence `3d21389`, handoff `b0adf6b` last and alone (commits, plan, handoff) | TRUE (`b0adf6b` touches only the handoff; the handoff cites `3d21389`) |
| #181 merged at `d99d22c` as `921efb5`, 2026-10-05T00:15:42Z, run 37245602888 green (commit, plan, disposition) | TRUE (gh) |
| RFC-2026-023 still In review, RFC-2026-028 Proposed, neither approved, no question answered (all) | TRUE |
| the Owner's words `ทำต่อตามแนะนำเลย` transcribed, not read as approval (disposition §1-§2) | TRUE as recorded; A0's message they answer is summarised, not quoted, as the disposition says |
| writable path + `DECISION_RECORDS` + `DIGESTED_FLOOR` + manifest key; 91 digests; four amendment paths, `test-suite-contract.mjs` dropped (commit, plan items 3-7) | TRUE (scope exit 0, 11 paths; 91 counted) |
| 33 pins moved +2 to 257+i, quotes on their lines (plan item 8) | TRUE |
| `[113]` and `[195]` appended, `[199]` at the end, nothing above rewritten (plan item 9, blockers) | TRUE (prefix comparison) |
| tests stay 685; `verify`, `check:handoff` green (handoff) | TRUE on the branch name |
| migrate-clean and rls-smoke not needed: no DB-read input changed (plan §3) | TRUE; `audit-coverage-map.json` is read only by the foundation contract test. I ran migrate-clean for prototypes and drifts, not for this batch; `db-rls-smoke` not run |
| "no wider than authenticated holds" (handoff impact; RFC-023 :84) | FALSE as worded (F6), harmless in effect |
| §0/6: shape B's pins that move are listed in §5 (RFC-023) | INCOMPLETE (F5) |
| "nothing a member of it" (RFC-028 §3.1, §4/1) | TRUE locally, FALSE on the platform (F1) |

## 5. Stop-the-line verdict

**No stop-the-line.** No secret, credential or customer data is in the diff; no role, grant, policy or
migration changed; no tenant path is reachable that was not before. Nothing blocks the merge of this
text-only batch: F1-F8 are defects in proposals and belong in the RFC texts **before approval**. On A0's §6
recommendation, my reading as a role run (not an acceptance): RFC-2026-028 should not be approved until F1,
F2 and F3 are folded into §3.1, §3.3, §3.6 and §4/1 (or recorded as conditions of approval with owners), and
F4 is added to §5; RFC-2026-023 can be approved with F5, F6 and F7 folded in, none of which changes its
shape.

## 6. Limits

- Same vendor and model family as the Author (§0).
- The prototypes are mine, typed on a throwaway shim cluster; they are not the implementing batches'
  migrations and do not discharge any §5 or §6 obligation of either RFC. The platform behaviour (F1's creator
  row, the pooler, `createrole_self_grant` on the platform, `aal` claims) was simulated or read, not measured
  on the provisioned instance.
- The scram probe used a `pg_hba.conf` line I prepended to my private cluster after `initdb -A trust`; every
  other connection was `trust`.
- `db-rls-smoke` was not run (no input it reads changed). The commit-when-clean refusal the plan reports at
  `1da0b1c` was read, not reproduced.
- I did not review RFC-2026-026's command or worker half beyond the parts both RFCs cite.
