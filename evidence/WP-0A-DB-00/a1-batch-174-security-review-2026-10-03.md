# A1 security review: batch 174 (migration 174, a job's tenant context; rules 10 and 11; 171 (6) by inheritance)

- **Package:** `WP-0A-DB-00`. **Role:** independent Security/Privacy reviewer, run `/claude/a1_bastion`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-174` (PR #185, Draft, OPEN, not merged), head `d111326`
  (`d11132609bbbcc47d29fbbd2ef7bc465d3e51f27`) over code `6bc9fc2` (`6bc9fc2b03a6ad1627704a581dae21053e2947cc`), base
  `600b48b` (main, the merge of #184). Author `/claude/a0_atlas`.
- **Scope:** the whole batch, `git diff 600b48b..d111326` (20 paths), read against the plan, the disposition and the
  governing text they cite.
- **Checked out as:** local branch `review/a1-batch-174` at `d111326`, in this run's own worktree (`wf_f7b078b4-0cd-3`).
  The branch NAME `agent/claude/WP-0A-DB-00-batch-174` is checked out in the Author's worktree, so for
  `check:handoff` and `verify` I cloned this worktree into my private directory (`a1-174/clone`), created the branch
  NAME there at `d111326` (`git rev-parse --abbrev-ref HEAD` printed it), pointed the clone's `origin/HEAD` at `main`
  (`600b48b`), and ran the commands there. Nothing was committed in the clone.
- **Status:** this file records findings. It advances no status and approves nothing: not batch 174, not RFC-2026-028,
  not D1-D10, not the number 174, not the narrowing of CTR-TEN-001. It fixes nothing.
- **File name:** carries the phase's date (2026-10-03), as every record of this phase does; written 2026-10-05.

## 0. What I am

I am a subagent started by a workflow of `/claude/a0_atlas`, the Author of this batch, of the same vendor and model
family as the Author. Under RFC-2026-024 that is the stated independence limit of this role run. Accepting this review
as the A1 role's signature is the Integration Owner's and the Product Owner's act, not mine. Where `open_blockers[202]`
(2) names A1 as co-owner of CTR-TEN-001's narrowing, this file is a findings record, not that acceptance.

The Owner's words quoted in the disposition (`พร้อมแล้วลุยเลยนะ ไม่ต้องรอผม`) reached me, as they reached the Author's
subagent, only through workflow task text. I did not see them said and cannot confirm them; the disposition says the
same of itself (§1), which is the honest statement.

## 1. Read and measured

**Read:** `CONTRIBUTING_AGENTS.md`; the plan `a0-batch-174-plan-2026-10-03.md`; the disposition
`product-owner-disposition-2026-10-03-batch-174.md`; `git diff 600b48b..d111326` in full for the migration,
`scripts/db/run.mjs`, `scripts/db/authz-proofs.mjs`, the three writers, the lint data, the foundation-contract test and
the manifest; RFC-2026-028 §3.4, §3.5, §4/2, Q-028-5, Q-028-6 and its new Implemented line;
`contract-catalog/shared-kernel/ctr-ten-001/schema.json` and `ctr-job-001/schema.json`;
`db/foundation/lint/data-classification.json` (`app.jobs` is `INTERNAL-3`, refused to clients); every reference to
`app.jobs` in `db/` (no function, view or command writes or reads it outside 050 and the fixtures); both commit messages;
the handoff (`handoffs/WP-0A-DB-00-author-handoff.json`, every field); `open_blockers[113]`, `[198]`-`[202]`.

**Measured** (Node `v24.20.0`, checked before every run; PostgreSQL 17.11 from `/opt/homebrew/bin` on
`127.0.0.1:5501`, TCP only, `-c unix_socket_directories=''`, `initdb --locale=C -A trust -U postgres`, `LC_ALL=C`, the
shim first, re-initdb every round; private directory `a1-174/`):

| # | What | Result |
|---|---|---|
| M1 | `node scripts/verify-branch-scope.mjs 600b48b WP-0A-DB-00` (worktree, `review/a1-batch-174`) | exit 0: "all 20 changed path(s) are declared, and every amendment explains one" |
| M2 | `npm run check:handoff` on the branch NAME (clone) | exit 0: "describes the branch: nothing substantive after its cited head". (On `review/a1-batch-174` it exits 75, no package declares that branch, as designed; and with the clone's `origin/HEAD` left at the clone source it exits 91 until pointed at `main`. Neither is a finding.) |
| M3 | `npm run verify` on the branch NAME (clone) | exit 0: `clean: exit 0 — tests 692, pass 692, fail 0, skipped 0, todo 0` |
| M4 | two clean rounds, `make db-migrate-clean` then `make db-rls-smoke` | both exit 0, twice. Post-migrate pass 55 / 39 / 16; pinned check probe 7 CHECKs and 5 NOT NULL columns, its 2 drifts refused; pinned grant probe its 12 drifts refused; 1200 isolation cases; `db-authz-proofs: ok — 14 claim(s) discharged by execution; 1 not run on this cluster (worker-login-authentication)`. The proof `job-names-its-tenant-context` printed the fifteen results the plan §3 records, line for line |
| M5 | live catalog after M4: every privilege anon, authenticated and PUBLIC hold on any column of `app.jobs`; every non-superuser role's privileges on the four new columns; dependants of `app.jobs`; function bodies naming it; policies on it; `authenticated` reading `actor_id` | no client privilege on any column; on the four, `app_worker` SELECT and INSERT only (plus the predefined `pg_read_all_data` / `pg_write_all_data`, which no non-superuser role is a member of, the membership rule says so); no view, rule or function depends on or names `app.jobs`; no policy; `authenticated`: `permission denied for table jobs` |
| M6 | CHECK coverage, as the superuser in a rolled-back transaction, 16 values | refused 23514: an address holding `@`, a number with a leading `+`, a newline (leading, trailing, inside), a Thai-script name. **Admitted:** a ten-digit string in the shape of a Thai mobile number, a thirteen-digit string in the shape of a Thai citizen ID, a dotted personal name (`given.family` form), an address with its `@` replaced by `:`, `actor_kind = 'user'` with a system actor's dotted name, `actor_kind = 'system_actor'` with a uuid, a uuid that is no user, `...` and `:` alone, 128 characters (A1-174-1, A1-174-2) |
| M7 | drift d1, `grant create on database postgres to app_worker`, appended to `140_audit.sql` | exit 2; rule 10: `app_worker CREATE on the current database` |
| M8 | drift d8, `grant create on database postgres to public` (140) | exit 2; rule 10 names every non-superuser role, and the client schema probe names `anon`, `authenticated`, `public` |
| M9 | drift d2, `grant execute on function app.jwt_subject() to app_maintenance` (140) | exit 2; rule 11: `unlisted: app_maintenance EXECUTE on app.jwt_subject()` |
| M10 | drift d10, `grant execute on function app.knowledge_scope_applies(uuid, uuid, uuid, uuid) to anon` (140) | exit 2; ONLY rule 11 fired (`unlisted: anon EXECUTE on app.knowledge_scope_applies(...)`), which bears out the handoff's "an anon EXECUTE in app no other probe saw" for migrate-clean |
| M11 | drift d6, `grant execute on function pg_catalog.pg_read_file(text) to public` (140) | exit 2; refused by the system object fingerprint (`function pg_catalog.pg_read_file(text) [changed]`), not by rule 11, which by design reads no PUBLIC EXECUTE outside `app` and `private` (A1-174-4) |
| M12 | drift d3, `create role a1_probe_group; grant a1_probe_group to authenticated; create policy ... on app.content_ideas for select to a1_probe_group using (true)` (140) | exit 2 at apply: `174_job_tenant_context.sql: batch 174: a policy TO a role a client role is a member of reads membership without the helper ...: content_ideas.a1_probe_group_reads (TO a1_probe_group)` |
| M13 | drift d4, the same three statements appended to 174 after its block | exit 2; refused by four catalog probes (permissive policy, client membership, the pinned grant probe's membership rule, policy set) before the post-migrate pass is reached (A1-174-5) |
| M14 | 174's block re-run by hand in rolled-back transactions on a migrated cluster | as built: passes. An ADMIN-only membership of `anon` in a role that holds a SET-only membership in a second role, a policy TO the second on `app.workspaces`: refused by name. A policy `using (true or app.is_active_member(id))` through a two-level chain: passes (A1-174-3). A RESTRICTIVE policy TO a group: not read (correct: it only narrows) |
| M15 | drift d7, an owner-rights view `public.a1_probe_job_actors` over the four columns granted to `authenticated` (appended to 174) | exit 2; client privilege probe (`not pinned or not security_invoker`) and read allowlist probe, by name |
| M16 | drift d9, `grant update (actor_id) on app.jobs to app_worker` (appended to 174) | exit 2; pinned grant probe column rule: `unlisted: app_worker UPDATE (actor_id) on app.jobs` |
| M17 | CHECK counts in `app` / `private` on the live catalog | 259 / 14 = 273, as `vocabulary-checks.json` says |
| M18 | `gh`: run 37309049441; PR #184; PR #185 | 37309049441 `success` on `1ae007f`, branch `...-batch-173-worker`; #184 merged at `1ae007f` as `600b48b`, 2026-10-05T12:40:13Z; #185 Draft, OPEN, head `d111326`, its `bootstrap` run 37327469747 was **in progress** when this file was written |

Every drift was appended to the file named, a fresh cluster each round, and the file restored byte for byte after
(`cmp` silent; `shasum` of `140_audit.sql` `2ac2fc2c...` and of `174_job_tenant_context.sql` `d50405c8...` equal to the
committed blobs at the end; `git status` clean before this file was written).

**Not measured by me** (read only): the CI negative control for `app.jobs`, the populated-table `ADD` (23502), the
WS:905 explain-harness load, try-it's demo on 55479, and the Author's `npm run check` on the uncommitted and amended
trees.

## 2. The questions asked

**Can a client write a job?** No. No client role holds any privilege on `app.jobs` (M5); the data classification
probe and the pinned grant probe refuse any (M15-style), and no definer function or view reaches the table (M5).

**Can the worker write a job with a forged actor?** Today no, and not because of 174: `app_worker` holds INSERT on the
four columns but no policy, so every insert is refused by row level security (the proof's `42501 rls`, M4). When the
enqueue policy lands, the database will accept any actor that fits the shape: nothing binds `actor_id` to a user, to a
member of the job's workspace, or to `actor_kind` (M6). RFC-2026-026 §3.5 makes this column the source of the worker's
audit `actor`, so the binding is a security property the worker half must carry (A1-174-1). Once written, the four
cannot be moved by any role (block (3), pinned-grants.json, M16).

**Can it write an unbounded or PII-shaped id?** Unbounded: no, 1 to 128 characters of `[A-Za-z0-9._:-]`, with
newlines refused (M6). PII-shaped: an e-mail address with its `@`, a `+`-prefixed number, a spaced phone number and
free text are refused, but a digits-only mobile number, a 13-digit citizen-ID shape and a dotted personal name are
admitted (M6). The migration header and the handoff's impact field are literally true ("a phone number written with
spaces", "a phone number with spaces"), but read as a privacy barrier they over-promise (A1-174-2).

**Does a new column leak to any client read path?** No (M5): no client grant, no view, no function, no policy; a
smuggled owner-rights view outside `app` is refused by two probes (M15). The columns are in an `INTERNAL-3` table.

**Do the new pins catch** `grant create on database` to `app_worker` (yes, rule 10, M7; and to PUBLIC, M8), a stray
EXECUTE (yes, rule 11, M9, M10; a PUBLIC grant on a `pg_catalog` function is the fingerprint's, M11), a policy TO a
group role `authenticated` inherits (yes: 174's block at apply time, M12, M14, including ADMIN-only and SET-only links;
after 174, four probes, M13)?

**Anything newly opened?** Nothing I could measure. 174 adds column grants to a role with no policy on the table, adds
no definer function, policy, view, role, membership or client grant. Rules 10 and 11 close two reaches (A1-173-3) and
one I had not named (M10).

## 3. Findings

Grades: HIGH (stop-the-line or blocks merge), MEDIUM (owed before the dependent batch lands), LOW (owed, recorded),
INFO (no remedy required here).

### A1-174-1 (LOW). The job's actor is not bound to anything but a shape

- **Where:** `db/foundation/migrations/174_job_tenant_context.sql:77-80` (the four CHECKs), `:91-92` (the grants).
- **What:** `actor_kind` and `actor_id` are checked independently: `'user'` with `retention.sweep`, `'system_actor'`
  with a uuid, and a uuid that is no user all insert (M6). Nothing ties a `'user'` actor to `auth.users`, or to a
  member of `workspace_id`. RFC-2026-026 §3.5 (Q-026-8) sources the worker producer's audit `actor` from this column,
  so whatever writes the job decides whose name the audit row carries.
- **Why not higher:** no writer can insert today (no policy TO `app_worker`; no command enqueues), so nothing is open
  now; RFC-2026-028 §3.4 asks only for "CTR-TEN-001's bounds", which 174 meets.
- **Remedy (owner: the batch that writes the first enqueue path, with RFC-2026-026's worker half, `[113]`/`[201]`
  (5); A1 to review):** derive the actor at enqueue from the caller (`app.jwt_subject()` inside a definer command, the
  way 172's closing command names its caller), never from a parameter; and add a coupling CHECK, e.g. `actor_kind <>
  'user' or actor_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'`, so a user actor is at least a
  uuid. Record the obligation on `open_blockers[202]` (or the worker half's blocker) so the audit `actor` is not trusted
  from an unbound column.

### A1-174-2 (LOW). The identifier shape is not a PII barrier, and two texts read as if it were

- **Where:** `174_job_tenant_context.sql:33-40` (header, "an e-mail address, a phone number written with spaces or a
  sentence do not"); `handoffs/WP-0A-DB-00-author-handoff.json:168` (`security_privacy_cost_impact`: "so an e-mail
  address, a phone number with spaces or free text cannot be stored there").
- **What:** measured (M6): a ten-digit mobile-number shape, a thirteen-digit citizen-ID shape, a dotted personal name
  and an address with `@` replaced by `:` are all admitted to `actor_id`, `request_id` and `correlation_id`. Both texts
  are literally true but omit that digits-only numbers and names pass.
- **Remedy (owner A0, in the next batch that touches the record; with the contract owner on `[202]` (2)):** state the
  limit in `open_blockers[202]` (5) and in the next handoff's impact field ("the shape refuses `@`, `+`, spaces and
  non-ASCII; it admits digits-only numbers and dotted names, so it is not a PII control"). If the contract restatement
  pins the ids' form (uuid, or a W3C trace id), tighten the CHECK to it then. Do not edit 174.

### A1-174-3 (INFO). 174's inheritance arm inherits 171 (6)'s textual helper test

- **Where:** `174_job_tenant_context.sql:181-183`.
- **What:** `using (true or app.is_active_member(id))` through a two-level chain passes the block (M14), because the
  test is a regular expression over the policy text. This is 171 (6)'s predicate, unchanged, and `open_blockers[202]`
  (5) already says the block "shares what [198] (6) says it does not see". On migrate-clean such a policy is also
  pinned by text (permissive policy and policy set probes).
- **Remedy:** none here.

### A1-174-4 (INFO). Rule 11 leaves PUBLIC's EXECUTE outside `app` and `private` to the fingerprint

- **Where:** `scripts/db/run.mjs:1630`.
- **What:** `grant execute on function pg_catalog.pg_read_file(text) to public` is not read by rule 11 (it skips any
  role's EXECUTE that PUBLIC holds, and reads PUBLIC only in `app`/`private`); the system object fingerprint refuses it
  (M11). The handoff's `known_limitations` states this for a role grant; it holds for a PUBLIC grant too. On a
  provisioned instance, where rules 2-4 and 7-11 fail by design until Q170-c, the fingerprint is the line that matters.
- **Remedy:** none required; if the fingerprint is ever relaxed for a provisioned instance, extend rule 11's PUBLIC arm
  to `pg_catalog`'s server-file and large-object functions at the same time.

### A1-174-5 (INFO). After 174, the inheritance arm is a fifth line, not the first

- **Where:** `174_job_tenant_context.sql:59-66` (header: "which the post-migrate pass re-runs after every later
  migration").
- **What:** a group-role policy added after 174 (M13) is refused by four catalog probes, which run before the
  post-migrate pass, so the pass is never reached and 174's arm is not what names it. Any such drift needs a new client
  membership, which the membership rules already refuse. The header is true; the arm's own value is at apply time
  (M12) and on a database where the probes are not run.
- **Remedy:** none.

## 4. Claims checked

| Claim (where) | Verdict |
|---|---|
| Plan §1/§3, commit 6bc9fc2: post-migrate 55 / 39 / 16; pinned grant probe 12 drifts, pinned check 2; 1200 cases; 14 proofs, 1 NOT RUN | TRUE (M4) |
| The proof's fifteen results (plan §3) | TRUE, line for line (M4) |
| Rule 10 catches A1's own drift; rule 11 catches a stray EXECUTE and an anon EXECUTE no other probe saw (plan §2 rows 5-6, handoff impact) | TRUE (M7, M9, M10) |
| A pg_catalog EXECUTE grant is refused first by the fingerprint (plan §3 D2, known_limitations) | TRUE for PUBLIC too (M11) |
| D3/D3b: a policy TO a group `authenticated` (or `anon`, through SET-only links) is a member of is refused by 174's block by name | TRUE (M12, M14) |
| `vocabulary-checks.json`: 61 of 273 (259 app, 14 private) | TRUE (M17) |
| `PINNED_FUNCTION_EXECUTE` 31 rows hold both ways on the clean set | TRUE (M4: rule 11 silent on both clean rounds) |
| No client privilege on the four; app_worker SELECT and INSERT; no role UPDATE (migration, plan, handoff, RFC Implemented line) | TRUE (M5, M16) |
| Blocker edits: `[113]`, `[198]`, `[199]`, `[200]`, `[201]` appended, `[202]` added at the end, nothing rewritten (commit, plan §5) | TRUE: each of the five old strings is a prefix of its new one; 202 -> 203 entries |
| `[202]` (2)'s narrowing stated exactly against CTR-TEN-001 | TRUE: the contract bounds the three ids by `minLength: 1` alone; the statement names the length and the character class |
| The rationale names the four files amended outside ownership | TRUE (M1) |
| #184 merged at `1ae007f` as `600b48b`, 2026-10-05T12:40:13Z, run 37309049441 green (disposition §2, commit) | TRUE (M18) |
| The handoff cites `600b48b..6bc9fc2` and `d111326` changes only the handoff (commit d111326) | TRUE (M2; `git show --stat d111326`: one file) |
| `npm run check` 692/692 on the amended code commit; red only on the handoff guard before (commit 6bc9fc2) | NOT MEASURED; `verify` on `d111326` is 692/692 (M3) |
| Security impact: "an e-mail address, a phone number with spaces or free text cannot be stored there" | TRUE as worded; incomplete as a privacy statement (A1-174-2) |
| The Owner's words of 2026-10-05 | NOT VERIFIABLE by this run; recorded as relayed, as the disposition itself says |

## 5. Stop-the-line verdict

**No stop-the-line.** I found no tenant leakage, secret exposure, lost job, migration divergence or contract mismatch
introduced by this batch. The narrowing of CTR-TEN-001 is a stated, owed contract difference (`[202]` (2)), not a
hidden one.

**Does anything block the merge?** No A1 finding does: A1-174-1 and A1-174-2 are LOW and owed, the rest INFO. The
merge still waits on what is not A1's to give: a green `bootstrap` on head `d111326` (run 37327469747 was in progress
when this was written; rules 10 and 11 are first read on CI there, `[202]` (4)), the Integration Owner's acceptance of
the number 174 (`[202]` (1)), and the C0 and Q0 runs.

## 6. Limits

- Same vendor and model family as the Author (§0). Not the A1 role's signature.
- Measured on PostgreSQL 17.11 migrate-clean clusters only; nothing on the provisioned instance, where 174 is
  declared not applied and rules 10 and 11 fail by design until Q170-c.
- The handoff guard and `verify` ran in a local clone on the branch name, not in the Author's worktree; `origin/HEAD`
  there was set to `main` by me.
- CI for `d111326` had not finished; I did not read rules 10 and 11 off it.
- I did not run try-it, the CI negative control, the WS:905 load or the populated-table `ADD`.
- The drifts are the ones in §1; a drift I did not think of is not covered by this file.
