# A1 Security/Privacy review: batch 125 (`43f4d96`, handoff `d85a643`)

Run: `/claude/a1_bastion`
Role: independent Security/Privacy reviewer for `WP-0A-DB-00`
Subject: branch `agent/claude/WP-0A-DB-00-batch-125` (Draft PR ThinkBizLab-Org/ThinkBizThai#163): `43f4d96`
(batch 125) and `d85a643` (the handoff, alone), on top of `7f6cefb` (`main`, #162 merged). The Author's
branch is checked out in the main checkout, so I checked `d85a643` out in my own worktree as the local
branch `review/a1-batch-125`. `git merge-base --is-ancestor 7f6cefb d85a643` holds: the head contains
the current `main`.
Author: `/claude/a0_atlas`
Date: 2026-09-28
Previous reviews: `a1-batch-123-security-review-2026-09-28.md` (F1-F9) and
`a1-batch-123-corrections-reverify-2026-09-28.md` (N1-N6).

**This document records review findings. It advances no package status, signs nothing on anyone's
behalf, writes `security_approved` nowhere, and repairs nothing it found.** It is one input to the
Product Owner's disposition. It is not the disposition.

---

## 0. What I am, before anything else

I am a subagent spawned by `/claude/a0_atlas`, the Author of the change under review. I ran in a
worktree of A0's repository, under a brief A0's workflow wrote, and I am the same vendor and model
family as A0. RFC-2026-024 withdrew the cross-vendor condition, so that fact does not by itself
disqualify this review. It does mean the Author chose what to point me at. **Whether this review counts
as the Security/Privacy signature on batch 125 is the Integration Owner's (`/claude/r0_steward`) and
the Product Owner's act.** It is not for me or for A0 to decide.

Batch 125 implements my own remedies: N1 remedy 1 (the settled-row closure) and remedy 3 (the owner
case), and F4's remedy (the database sets `decided_at`). So I am reviewing my own remedies and have a
stake in calling them sufficient. To offset that, I attacked the properties they are meant to hold
("a settled decision cannot be changed", "the decision time is the database's") from every writer I
could reach, not only the paths my remedies named. §4 reports four places where they do not hold.

Every claim below either names the file and line it rests on or was measured on a live cluster. §2
separates what I measured from what I only read or inferred.

## 1. What was reviewed

`git diff 7f6cefb d85a643`, read in full: 17 files, +594/-139. The parts that carry security weight:

- `db/foundation/migrations/125_approval_settled_is_immutable.sql` (new):
  - the restrictive UPDATE policy `approval_requests_settled_is_immutable`, `USING (status = 'pending')
    WITH CHECK (true)` (:40-43);
  - `private.set_decided_at()`, SECURITY INVOKER, `search_path = ''` (:50-66), its two branches
    (:57-63), `revoke all ... from public` (:68), and the BEFORE UPDATE trigger (:75-76);
  - the apply-time block pinning the policy's deparse, the trigger's definition and `tgenabled = 'O'`,
    and the function's md5, invoker-ness, `proconfig` and PUBLIC EXECUTE (:78-105).
  No other migration changed; 125 is not on `main`, so no integrated migration is rewritten.
- `scripts/db/run.mjs`: `ATTRIBUTION_UPDATE_CLOSURES` and the rewritten `CLOSURE_COVERAGE_PROBE_SQL`
  (:218-238); `PINNED_POLICIES` and `PINNED_POLICY_PROBE_SQL` (:269-289); the FK-support probe now first
  in `CATALOG_RULE_PROBES` with two drifts (:406-413); `TRANSACTION_CONTROL` (:481); `catalogProbeJobs`
  with the clean-again round (:482-492); `decideCatalogProbes` (:493-521); the executor, unchanged:
  `rerun = (sql) => feed(\`begin;\n${sql}\nrollback;\n\`)` (:1772).
- `test-kits/db/foundation-contract.test.mjs`: 125's pin test (:2217-2239); the probe-list, job-list and
  verdict tests (:2324-2413, :2443-2486).
- `tests/db/identity/identity-isolation.test.mjs:703-721` (the `runCases` test of `violates`).
- `tests/db/identity/isolation-cases.mjs`: the four BATCH 125 cases (:13614, :13626, :13785, :16744),
  the rewritten `violates` on the editor's cancel case (:13562), and `APPROVAL_DECISION_TIME_IS_THE_DATABASES`
  (:17274).
- `db/foundation/invariants/090_approval.1.sql` and `superseded.json` (090's replacement names 125).
- `db/foundation/README.md` (the catalog-rule section).
- `work-packages/WP-0A-DB-00.json`: blocker 186 and blocker 190 (the RFC-2026-025 blocker), 1-based
  indices in the 190 entries of `open_blockers`, and blocker 189; the handoff; A0's record `a0-batch-125-record-2026-09-28.md`; the
  Owner disposition `product-owner-disposition-2026-09-28-after-162.md`.
- For context, unchanged: `090_approval.sql:317-332, 347-349, 481, 563-595, 875-878`;
  `123_attribution_closures_everywhere.sql:78-89`; `scripts/db/run.mjs:352-399` (the trigger probe);
  `scripts/db/psql-driver.mjs:120-160, 278-280`; `docs/sprint-0a/sprint-0a-core-erd-rls-retention-th.md:186, 496`.

## 2. Method: measured vs read

### 2.1 Setup

**Measured.** A private PostgreSQL 17.11 cluster (`/opt/homebrew/bin`) on `127.0.0.1:5501`, TCP only
(`-c unix_socket_directories=''`), `initdb --locale=C -A trust -U postgres`, `LC_ALL=C TZ=UTC`,
`TMPDIR` inside my private directory `.../scratchpad/a1-125/`. Node was `v24.20.0` (`.node-version`
24.20.0); my round script refuses to run on any other version, and it did refuse once, when
`/opt/homebrew/bin` put a Node 26 first on `PATH`, before I pinned the path. The cluster was
re-initdb'd for every round. Each round:

1. copied the pristine `140_audit.sql` back;
2. appended the round's drift, if any;
3. applied `db/foundation/ci/supabase-shim.sql`;
4. ran `DB_TEST_URL=postgresql://postgres@127.0.0.1:5501/postgres make db-migrate-clean`, then
   `make db-rls-smoke`;
5. restored `140_audit.sql` byte for byte.

`140_audit.sql` hashes `2ac596bb...c1ad37149` before the first round, after every round and at the end.

Behavioural scripts ran on migrated, fixture-loaded clusters. They took identities with
`set_config('request.jwt.claims', ...)` and `set_config('role', ...)`, as the repository's helpers do.
Every attempt ran in its own transaction and was rolled back. Where an attempt needed a drift, it
created the drift as `postgres` inside that transaction.

Ports: 5432 was not listening at any point. 5499 was held by another run (pid 39193); I never
connected to it.

**Static, on the branch name `review/a1-batch-125`:**
- `node --test test-kits/db/foundation-contract.test.mjs`: 72 of 72, exit 0.
- `node --test tests/db/identity/identity-isolation.test.mjs`: 303 of 303, exit 0.
- `node scripts/scan-repository-secrets.mjs`: exit 0.

A grep of every added line of `git diff 7f6cefb d85a643` for credential, token, key, address and
connection-string shapes found prose only ("tokens in their expressions").

### 2.2 Rounds (drift appended to 140, fresh cluster each)

| Round | Drift | migrate-clean | rls-smoke | What caught it |
|---|---|---|---|---|
| R0head, R0b | none | ok: 11 probes, 38 jobs, each clean as built, refusing each of its drifts (2+1+1+1+1+1+1+1+1+2+4) and clean again; 45 blocks, 35 as written, 10 replaced | ok, 990 | none needed |
| R3c | my R3c: the decide policy's USING admits a settled row for the owner only | ok | **ok, 990** | nothing needs to: the closure refuses the takeover (§2.3) |
| R3c+RP-drop | R3c plus the settled closure dropped | **FAIL**, pinned policy probe, by name | **FAIL**, 1: `owner-a-cannot-redecide-a-settled-approval-request` | both |
| RP-drop | the settled closure dropped alone | **FAIL**, pinned policy probe | ok, 990 | probe only (correct: 090's USING halves still require `pending`) |
| RT-disable | `alter table app.approval_requests disable trigger set_decided_at` | **FAIL**, trigger probe: `set_decided_at (tgenabled D)` | **FAIL**, 3: backdate, postdate, `editor-a-cannot-cancel-...-naming-a-decider` | both |
| RT-replica | `enable replica trigger set_decided_at` | **FAIL**, trigger probe: `(tgenabled R)` | FAIL, the same 3 | both |
| RT-drop | `drop trigger set_decided_at` | **FAIL**, post-migrate pass: 125's block, "trigger is missing, disabled or not in its required shape" | FAIL, the same 3 | both |
| RT-noop | the function body replaced with `begin return new; end` | **FAIL**, post-migrate pass: 125's block, "missing, rewritten, or not SECURITY INVOKER ..." | FAIL, the same 3 | both |
| RT-public-exec | `grant execute on function private.set_decided_at() to public` | **FAIL**, post-migrate pass: 125's block | ok, 990 | block only (the grant is harmless, §3 Q2) |
| **RP-paramacl** | `grant set on parameter session_replication_role to authenticated` | **ok** | **ok, 990** | **none** (V3) |

### 2.3 The settled-row matrix (Q1)

**Measured on R0head, 819 attempts on `approval_request_a1_decided`** (approved by the approver):

- **Identities (13):** owner, admin, editor, page-scoped editor, approver, viewer, suspended member,
  the other tenant's owner, `authenticated` with no `sub`, `anon`, `service_role`, `app_worker`,
  `app_command`.
- **Paths (9):** T1 keep `approved` and name self as decider; T2 re-decide as self dated 2001; T3
  revert to `pending` with no decision; T4 cancel it; T5 overturn to `changes_requested` keeping the
  approver as decider; T6 `MERGE ... WHEN MATCHED THEN UPDATE`; T7 a CTE `update ... from`; T8 a row
  constructor `set (...) = row(...)`; T9 touch `updated_by` only.
- **Drift classes (7), each created inside the attempt's transaction:** C clean; L a loose permissive
  sibling `using (true) with check (true)` TO authenticated (my L3-L5); P the same TO public; O the
  decide policy opened to `using (true) with check (true)` (my O3); R my R3c; A a third permissive
  "owner amend" policy (my R3's shape); X the CONTROL, the settled closure dropped plus L.

| Class | Client attempts | Changed rows | Outcome |
|---|---|---|---|
| C clean | 81 | **0** | 75 `UPDATE/MERGE 0`; 6 MERGE refused "target row violates row-level security policy (USING expression)" |
| L loose sibling | 81 | **0** | 75 filtered; 6 MERGE refused by `approval_requests_settled_is_immutable` **by name** |
| P loose sibling TO public | 81 | **0** | the same |
| O decide policy opened | 81 | **0** | the same |
| R **R3c** | 81 | **0** | 75 filtered; the owner's MERGE refused by the settled closure by name; 5 others by RLS |
| A owner-amend sibling | 81 | **0** | the same as R |
| X closure dropped + L (control) | 81 | **5** | 39 refused by the trigger, 10 by 123's decider closure, 27 reached nothing; **the 5 are all the approver, the recorded decider**: T1 (no change of decider), T5 overturn, T6 and T7 re-decide keeping itself, T9 |
| every class, `anon`, `service_role`, `app_worker`, `app_command` | 252 | 0 | `permission denied for schema app` |

Under R3c specifically, the owner's T1 (take over) and T2 (overturn dated 2001), the two attempts that
landed in my review of 123's corrections, are `UPDATE 0`. `INSERT ... ON CONFLICT (id) DO UPDATE` onto
the settled row, with `id` made insertable and a loose sibling (both in-transaction), was refused for
the owner by the settled closure by name (U1).

X shows what each layer holds. Without the closure, the trigger refuses any change of decider or
time, and 123's closure refuses a writer who is not the decider. What neither refuses is the recorded
decider flipping its own outcome while keeping its original `decided_at`. On the head the settled
closure refuses that too, and it is pinned (RP-drop fails migrate-clean).

### 2.4 The decision-time matrix and the non-client writers (Q2)

**Clients, measured on R0head, 99 attempts on the pending `approval_request_a1`:** D1 approve as self
with `decided_at = 2001`, D2 with 2999, D3 with no `decided_at`, D4 with `decided_at = NULL`, D5 MERGE
with 2001 (and D5r reading it back), D6 CTE with 2001, D7 row constructor with 2001, D8 cancel with a
`decided_at` and no decider, D9 set `decided_at` alone on the pending row, D10 set `decided_at` alone
on the settled row.

- **16 landed** (owner and approver, D1-D7). **Every one recorded `decided_at = now()`**; 0 kept the
  client's value.
- D8 and D9 were refused (123's pair, or RLS); D10 was `UPDATE 0`; no other identity changed a row.

**Non-client writers, measured on R0head:**

| # | Writer and attempt | Result |
|---|---|---|
| N1 | superuser: backdate the settled decision to 2001 | refused by the trigger (23514) |
| N2 | superuser: rewrite the settled decider | refused |
| N3 | superuser: revert the settled request to `pending` | refused |
| **N4** | superuser: `approved` to `changes_requested`, keeping decider and time | **UPDATE 1** (V1) |
| N5 | superuser: decide a pending request, sending 2001 | UPDATE 1, `decided_at = now()` |
| N6 | superuser, `set local session_replication_role = replica`: backdate to 2001 and rewrite the decider | **UPDATE 1** |
| N7 | superuser, `alter table ... disable trigger set_decided_at`: the same | **UPDATE 1** |
| **N8** | superuser: INSERT a request already `approved`, dated 2001 | **INSERT 0 1**, 2001 kept (V1) |
| N9 | superuser: DELETE the settled request (after its events) | DELETE 1 (the trigger does not touch DELETE) |
| N10 | superuser: replace the settled decider with a nil sentinel (an anonymiser's write) | refused (V2) |
| **N11** | superuser: cancel a request, then approve the cancelled request | **UPDATE 1**, `decided_at = now()` (V1) |
| N12 | superuser: `select private.set_decided_at()` | "trigger functions can only be called as triggers" |
| K1 | `app_command`, acting for the approver, under an RFC-2026-023 shape-B-like sketch (the service-path closure amended, a grant and an open policy, all in-transaction): decide a pending request sending 2001 | UPDATE 1, `decided_at = now()` |
| K2, K3, K5 | the same writer: backdate, rewrite decider, revert the settled request | refused by the trigger |
| **K4** | the same writer: overturn the settled request keeping the approver's name and time | **UPDATE 1** (V1) |
| **K6** | the same writer: INSERT an `approved` request naming the owner, dated 2001 | **INSERT 0 1** (V1) |
| **K7** | the same writer, acting for the approver: cancel a request, then approve it naming the **owner** | **UPDATE 1** (V1; N2 of my last review) |
| W1, W2 | `app_worker` with a grant and an open policy (no closure amendment) | `UPDATE 0` both: 092's closure holds |

**The transaction's time, measured (`txtime.sh`).** Session A, as the approver, opened a transaction.
One second later session B raised a new pending request and committed. Session A then decided it:
`decided_at` 09:00:42.119, `created_at` 09:00:43.145, `decided_at < created_at` true, and the
recorded time lagged the decision by 3.01 s (V5).

**The parameter grant, measured in-transaction (`p2.sql`).** On the clean set `authenticated` gets
`permission denied to set parameter "session_replication_role"`. After `grant set on parameter
session_replication_role to authenticated`, the approver set replica mode in its own transaction and
approved with `decided_at = 2001` and `updated_at = 2001`: `UPDATE 1`, both kept. The owner inserted a
request pinned to a content version that does not exist: `INSERT 0 1`, because foreign-key triggers do
not fire in replica mode. `pg_parameter_acl` was empty again after the rollback (V3).

### 2.5 Legitimate flows (Q3)

**Measured on R0head**, over workspace A's pending requests, the same statements I counted on
batch 123's corrections:

| Flow | owner | admin | editor | page editor | approver |
|---|---|---|---|---|---|
| approve as self | UPDATE 4 | refused | refused | refused | UPDATE 3 |
| request changes as self | 4 | refused | refused | refused | 3 |
| `MERGE` approve as self | 4 | refused | refused | refused | 3 |
| plain cancel | 4 | 3 | 3 | 2 | refused |
| approve as self, **no `decided_at` sent** (new) | 4 | refused | refused | refused | 3 |

Identical to the earlier counts; the last row is new behaviour (the trigger fills the time). The
fixtures load `approval_request_a1_decided` and workspace B's decided request by INSERT with explicit
times (`090-approval-fixture.sql:191`), which the UPDATE-only trigger leaves alone; rls-smoke passes
990 of 990.

### 2.6 The self-tests, the clean-again round and TRANSACTION_CONTROL (Q4)

**Interruption, measured on R0b (`kill.sh`).** A driver in my private directory imported the runner's
own `CATALOG_RULE_PROBES`, `catalogProbeJobs` and `decideCatalogProbes` and the driver's own `feed`,
and ran the FK-support and pinned-policy probes' jobs (as built, the three new drifts, and the
clean-again jobs) exactly as `run.mjs:1772` does, in a 40-loop run I interrupted:

- **16 client-side interruptions** (8 SIGKILL, 8 SIGINT of the driver and its psql child) after
  0.05-1.6 s, landing in "as built", in each new drift and in "as built, after every drift";
- **2 backend SIGKILLs**, with `drop index app.content_targets_social_scope_idx` and
  `alter table app.billing_invoices drop constraint billing_invoices_subscription_scope_fk` each held
  open by `pg_sleep` (the server log records both "terminated by signal 9");
- **1 `pg_ctl stop -m immediate`** with all three new drifts open in one transaction, then a restart.

After every one: the index present, the FK present, the settled closure's USING `(status =
'pending'::text)`, 0 `pg_db_role_setting` rows, 0 `pg_parameter_acl` rows, no other backend in a
transaction. While each drift was open, a second session read the committed catalog (`pending`, the
index present); the policy drift held an `AccessExclusiveLock` on `approval_requests` (`kill4.sh`).
One uninterrupted pass of all 38 jobs afterwards: `verdict ok=true jobs=38 failures=0`.

**TRANSACTION_CONTROL, static (`tc.mjs`).** The regex (`run.mjs:481`) refuses `commit;`, and it
**admits** each of these drift texts:
- `select 'com' || 'mit' \gexec` (psql executes the result as a statement);
- `\c` followed by statements (a new session, outside the wrapper's transaction);
- `\set a COM`, `\set b MIT`, `:a:b;` (psql variable interpolation);
- `\i <file>`.

It also refuses texts that hold no transaction control: any `do $$ begin ... end $$` block, and a
comment containing the word `commit`.

**TRANSACTION_CONTROL, live, through the runner's own job list and verdict**, with one drift replaced
in a copy of the probe list:
- **M1**: the trigger probe's drift 3 followed by `select 'com' || 'mit' \gexec`. The role default
  committed. Its own probe then failed "as built, after every drift", so the verdict was
  `ok=false`: the clean-again round caught it. Residue removed afterwards (0 rows).
- **M2**: the pinned policy probe's drift, preceded by `grant set on parameter
  session_replication_role to authenticated;`, a `\gexec` commit and a `\gexec` begin. The grant
  committed. The policy change sat in the second transaction, which the probe's raise aborted. **The
  verdict was `ok=true`, 38 jobs, 0 failures**, with `authenticated=s/postgres` left in
  `pg_parameter_acl`. RP-paramacl shows that the post-migrate pass and rls-smoke do not see that grant
  either. Residue removed afterwards (0 rows).

**Meta-commands mid-line, measured (`midline.mjs`).** `select 1 as one; \! touch <file in my private
directory>` fed through `script()`, the path migrations take, **ran the shell command**. Fed through
`feed()` inside the probe wrapper, it ran again. The repository's static rule for migrations,
replacements, fixtures and helpers (`foundation-contract.test.mjs:2123, 2288`: a line that *begins*
with a backslash) did not flag the line (V4). The file was removed.

### 2.7 What the new error paths print

**Measured.** At the drivers' `VERBOSITY=verbose`, the trigger's refusal is `23514: an approval
request that records its decision keeps its decided_by and decided_at`, with `CONTEXT: PL/pgSQL
function private.set_decided_at() line 7 at RAISE` and a PostgreSQL source `LOCATION`. There is no
DETAIL, no row value and no identifier, for the superuser and, under the X drift, for a client alike.
On the clean set a client never reaches it, because the settled closure filters the row first (§2.3,
C: 0 trigger refusals). The MERGE refusal names the policy
(`approval_requests_settled_is_immutable`) on a row the caller can already read in full.

### 2.8 Read or inferred, not measured

- That the shim behaves as Supabase does (`supabase-shim.sql:1-18` says it is not Supabase). In
  particular I did not measure whether Supabase's `postgres` role can set `session_replication_role`.
  It owns the table, so it can disable the trigger.
- That PostgREST gives a client no way to issue `SET` (V3, V5 reach), and that its transaction is one
  request long.
- V2's reading of batch 160 rests on `sprint-0a-core-erd-rls-retention-th.md:496` and
  `090_approval.sql:347, 875-878`. Batch 160 does not exist yet.
- The backend-crash case for the pinned policy drift: my two later attempts to SIGKILL that backend
  returned `No such process` from my shell although `pg_stat_activity` showed the pid live. I did not
  resolve why, so that drift's crash case rests on the immediate shutdown only.
- Blocker and RFC wording in Q5 is read, not measured.

## 3. The brief's questions, answered

### Q1. Can any identity still re-decide, revert or take over a settled request, through UPDATE, MERGE, CTE or row constructor?

**No client can, on the clean set or under any drift I measured short of dropping the closure**
(§2.3): 0 changed rows in 486 client attempts across C, L, P, O, R3c and A, over all nine paths.
- R3c now passes every layer because it is harmless: the owner's takeover and overturn are
  `UPDATE 0`, and the MERGE is refused by the closure by name.
- The L3-L5 and O3 classes (24 of 24 landed in my last review) are all `UPDATE 0`.
- Dropping the closure fails migrate-clean by name (RP-drop). With R3c also present, the new owner
  case fails as well (R3c+RP-drop).

**Non-client writers can still overturn** (N4, K4) **and re-open a cancelled request as a decision**
(N11, K7). The settled closure is `TO authenticated`, and the trigger freezes only the decider and
the time (V1). No such writer reaches the table today: W1 and W2 reach 0 rows, and `app_command` holds
no grant.

### Q2. Can any writer still choose a decision time, backdate, postdate, or change a recorded decider or time? Is SECURITY INVOKER with EXECUTE revoked from PUBLIC right? Does the trigger leak?

- **Clients: no**, through UPDATE, MERGE, CTE or row constructor. 16 of 16 decisions that landed were
  recorded as `now()` (D1-D7), and a settled row is unreachable (D10). My F4 is closed for clients.
  One residue: `now()` is the transaction's start, so a decider holding a direct transaction open can
  date a decision up to that long before it was taken, even before the request existed (V5, NOTE).
- **`app_worker`:** 0 rows (W1, W2).
- **`app_command` under a shape-B sketch:** cannot choose the time at a decision (K1), and cannot
  change a recorded decider or time (K2, K3, K5). It **can** insert a decision with any time and any
  decider (K6), overturn one in the decider's name (K4), and decide a cancelled request (K7) (V1).
- **Superuser:** refused on the three edits the trigger names (N1-N3). A superuser can still insert
  any time (N8). It can bypass the trigger with `session_replication_role = replica` (N6) or `DISABLE
  TRIGGER` (N7), which is inherent to a superuser and to the table owner. As a later file:
  - `DISABLE TRIGGER` and `ENABLE REPLICA TRIGGER` are caught by the trigger probe by name
    (RT-disable, RT-replica);
  - dropping the trigger or rewriting its body is caught by 125's block in the post-migrate pass
    (RT-drop, RT-noop);
  - rls-smoke also fails 3 cases for each of these four;
  - **one route passes every layer: a parameter ACL granting `SET session_replication_role`**
    (RP-paramacl, V3).
- **SECURITY INVOKER with an empty `search_path` and no PUBLIC EXECUTE is right and safe.**
  - The function touches only `NEW`, `OLD` and `pg_catalog.now()`, so it needs no privilege.
  - `has_function_privilege` is false for `authenticated` and `app_command`, and the trigger still
    fires for both (D1, K1), because EXECUTE on a trigger function is checked when the trigger is
    created.
  - A direct call is refused (N12).
  - A definer would have enlarged the definer set, and the definer probe would have refused it.
  - Granting EXECUTE back to PUBLIC is caught (RT-public-exec).
- **No leak** (§2.7).

### Q3. Does the closure or the trigger refuse any legitimate flow?

**Nothing that exists today** (§2.5):
- decide, request changes, MERGE and cancel keep their row counts;
- the fixtures are INSERTs and are untouched;
- rls-smoke passes 990 of 990;
- §4 invariant 8 (`sprint-0a-core-erd-rls-retention-th.md:186`) documents no client flow that amends
  a settled request;
- batch 160's retention DELETE is untouched (N9: DELETE 1). The trigger is BEFORE UPDATE and the
  closure is FOR UPDATE.

**One documented future flow is refused.** APPROVAL-HISTORY's rule is "anonymize actor after minimum
retention; preserve decision integrity" (`:496`). Replacing `decided_by` on a decided row is refused
for every writer (N10), and 090's equivalence forbids NULL there (`090_approval.sql:330-332`). So batch
160 cannot anonymise the decider without amending 125's pinned function, or without disabling the
trigger, which the trigger probe refuses (V2).

### Q4. The new self-tests and the clean-again round: residue on interrupted runs? Is TRANSACTION_CONTROL bypassable?

- **No residue from the new drifts under any interruption I produced** (§2.6). This is structural: the
  executor never commits, the three new drifts are transactional DDL, and an error or a disconnect
  aborts the transaction.
- A concurrent session sees the committed catalog while a drift is open. The policy drift takes an
  `AccessExclusiveLock` on `approval_requests` for its duration. That is harmless on a test database
  and worth knowing if `DB_TEST_URL` ever points at a shared one.
- **TRANSACTION_CONTROL is bypassable, but only through psql meta-commands** (`\gexec`, `\c`, `\set`
  with interpolation, `\i`). Inside the wrapper's `begin`, SQL itself cannot end the transaction:
  - a `DO` block or a procedure that commits raises "invalid transaction termination";
  - `EXECUTE 'commit'` is not implemented;
  - `PREPARE` accepts no transaction command;
  - a comment or quoted identifier cannot form the keyword;
  - dollar-quoting only hides the word inside a literal.
  The regex is also over-broad: it refuses every `DO` block, so a drift can never replace a function
  body (RT-noop could not be a self-test).
- **The clean-again round catches residue that some probe reads, and nothing else.** M1 went red. M2,
  whose residue no rule reads, went green with a parameter grant left behind. The same meta-command
  class runs a shell command on the host from a migration line the static rule reads as clean (V4).

### Q5. Is the recording of N2-N6 and F5/F6 accurate and graded as I graded it?

**Accurate in substance and graded as I graded them**, with three gaps (V7). Checked against my file:

| Mine | Where | As recorded | Grade |
|---|---|---|---|
| N1 LOW (Owner may read MEDIUM) | blocker 186 item (1), closed by 125 | faithful, R3c named | as given |
| N2 NOTE | 186 item (9), still owed; handoff `known_limitations` | faithful | as given |
| N3 NOTE | 186 item (8), closed by 125 | faithful, **UPDATE half only** (V6) | as given |
| N4 NOTE | 186 item (10), still owed | faithful | as given |
| N5 NOTE | 186 item (4) with Q0 F3, closed by 125 | the `commit` half is done; my optional backslash half is neither done nor recorded, and V4 shows it matters | as given |
| N6 LOW | blocker 190 (a)-(d); 189 carries N6.h | a-f faithful; **N6.g (no mechanical "head contains main" check) is absent** | as given |
| F4 LOW | 186, closed by 125 | faithful | as given |
| F5 LOW, F6 NOTE | 186 "still owed", with the stated grades | faithful | as given |

Blocker 186's closing sentence says the trigger "refuses any change to a recorded decision for every
writer". It refuses any change of the decider or the time. It does not refuse a change of the outcome
by a non-client writer (N4, K4). The handoff's "a recorded decision's decider and time are frozen for
every writer" is exact.

### Q6. Stop-the-line risks?

**None found in `43f4d96` / `d85a643`** (§5).

## 4. Findings

### Status of my earlier findings

- **N1 (a settled decision can be taken over): CLOSED as measured, for clients.** The closure is my
  remedy 1 word for word (`125_...sql:40-43`). It is pinned by text (`run.mjs:269-289`), asserted at
  apply time (`:80-89`) and in 090's replacement, and carries my remedy 3's owner case
  (`isolation-cases.mjs:13785`). R3c, L3-L5 and O3 now change 0 rows. The non-client half is V1.
- **F4 (the decider chooses `decided_at`): CLOSED for clients and for every UPDATE.** The residue is
  the non-client INSERT (V1) and the transaction-time bound (V5).
- **N3: CLOSED at UPDATE.** The INSERT half remains (V6).
- **N5: the `commit` half CLOSED.** The meta-command half is V4.
- **N2, N4 (NOTE), N6 (LOW), F5 (LOW), F6 (NOTE): OPEN, recorded accurately** (Q5), except N6.g (V7).

### V1: LOW (not live; for RFC-2026-023). The trigger freezes the decider and the time, not the decision: a non-client writer can overturn a decision in its decider's name, decide a cancelled request, or insert a decision with any time

**What.** `private.set_decided_at()` (`125_...sql:57-63`) has two branches:
- when `decided_by` goes from NULL to a value, it sets `decided_at := now()`;
- once a decider is recorded, it refuses a change to `decided_by` or `decided_at`.

It never reads `status`, and it is BEFORE UPDATE only (`:75-76`). For clients, the settled closure
bounds the row (`:40-43`), but the closure is `TO authenticated`. For every other writer, the trigger
is the whole guard.

**Evidence (measured, §2.4).**
- The superuser and `app_command` under a shape-B-like sketch each turned the approver's `approved`
  into `changes_requested`, still under the approver's name and 2026-09-11 time (N4, K4: `UPDATE 1`).
- Each turned a cancelled request into a decision (N11, K7). K7 named the **owner** while acting for
  the approver.
- Each inserted an already-decided request dated 2001 (N8, K6: `INSERT 0 1`).
- Today no non-client writer reaches the table: W1 and W2 are 0 rows, `app_command` holds no grant,
  and 092's closure refuses both.

**Why it matters.**
- The commit title says "a settled approval is immutable", and blocker 186 says the trigger "refuses
  any change to a recorded decision for every writer". Both hold for clients only.
- §4 invariant 8 (approval history immutable) is the property.
- RFC-2026-023's command path is the writer class it leaves open. An overturn that keeps the original
  decider's name forges the one record of who passed the approval gate.

**Why LOW.** It is not live, and it needs a later grant or policy for a non-client role.

**Remedies (the Owner's choice):**
1. In the trigger's second branch, also refuse `new.status is distinct from old.status` once a
   decision is recorded. Treat `cancelled` and `expired` as terminal too: refuse any UPDATE of
   `status`, `decided_by` or `decided_at` when `old.status <> 'pending'`.
2. A BEFORE INSERT branch that sets `decided_at := now()` when `decided_by` is not null. Check first
   whether any case depends on the fixtures' literal times, or keep the fixtures on a separate loader
   path.
3. When RFC-2026-023 is disposed, state that the command role gets the same settled-row closure as
   `authenticated` (my N2, extended to this policy).
4. Say "for clients" in blocker 186's sentence.

### V2: LOW (privacy; forward, not live). The trigger will refuse APPROVAL-HISTORY's own retention rule, "anonymize actor after minimum retention"

**What.**
- `sprint-0a-core-erd-rls-retention-th.md:496` gives APPROVAL-HISTORY "anonymize actor after minimum
  retention; preserve decision integrity". `090_approval.sql:347` names `decided_at` as the column
  batch 160's sweep reads.
- The trigger refuses any change to `decided_by` once set, for every writer (`125_...sql:59-62`).
- 090's equivalence forbids a decision with a NULL decider (`090_approval.sql:330-332`), so
  anonymisation must rewrite the uuid. The trigger refuses exactly that.

**Evidence (measured).** N10: the superuser replacing the approver's uuid with a nil sentinel was
refused. N9: DELETE is untouched.

**Why it matters.** Batch 160 cannot anonymise without amending 125's md5-pinned function (a
post-migrate replacement plus a new pin) or disabling the trigger around the sweep. Disabling it is
the easy path, and it is exactly what the trigger probe exists to refuse. Under PDPA, the anonymisation
obligation is the legal one.

**Why LOW.** Nothing runs a sweep before G0, but the design should be settled before 160, not
discovered there.

**Remedy.** Record on the batch 160 blocker, before 160 is planned, that anonymising the decider is
refused by 125's trigger. Name the route. For example, the trigger admits a `decided_by` change only
to a documented anonymisation sentinel and only when `current_user = 'app_maintenance'`, pinned by
body digest as now, with an rls-smoke case showing that a client cannot use it. Or anonymise through
a mapping the columns point at, not by rewriting them.

### V3: LOW (drift-only; the class the trigger probe states, reached through another catalog). A parameter ACL on `session_replication_role` passes every layer and turns every trigger and foreign key off for a client session

**What.** The trigger probe's rule 3 (`run.mjs:372-381`) reads `pg_db_role_setting` only.
PostgreSQL 15+ can grant `SET` on a superuser parameter through `pg_parameter_acl`. No probe, block
or case reads it.

**Evidence (measured).**
- **RP-paramacl** (`grant set on parameter session_replication_role to authenticated` in a later
  file): migrate-clean ok, rls-smoke 990 of 990.
- Under that grant, in-transaction (`p2.sql`):
  - the approver set replica mode and recorded a decision dated 2001 with `updated_at` 2001
    (`UPDATE 1`);
  - the owner inserted a request pinned to a content version that does not exist (`INSERT 0 1`).
- The grant is also M2's invisible residue (§2.6).

**Why LOW, not higher.** It needs a later file to make the grant, and a client session that can
issue `SET`. As far as I read, PostgREST gives a client none (§2.8). It stays inside the caller's own
tenant rows, because RLS is not affected by replica mode.

**Remedy.** A fourth rule in the trigger probe, with its own self-test drift: no `pg_parameter_acl`
entry grants `SET` or `ALTER SYSTEM` on `session_replication_role` to any role. Or refuse any
parameter ACL at all outside a pinned list.

### V4: LOW (pre-existing in the static rule; new in the defence 125 adds). psql executes a meta-command anywhere on a line, so TRANSACTION_CONTROL and the "no meta-command" rule are both bypassable, and the clean-again round sees only residue a probe reads

**What.**
- The executor and the migration path feed SQL to psql on stdin (`psql-driver.mjs:120-160, 278-280`;
  `run.mjs:1772`), where psql executes any unquoted backslash command, wherever it sits on a line.
- The repository's rule for migrations, replacements, fixtures and helpers reads only lines that
  *begin* with a backslash (`foundation-contract.test.mjs:2123, 2288`).
- `TRANSACTION_CONTROL` (`run.mjs:481`) reads keywords, not meta-commands.
- No rule reads `selfTests` drifts for backslashes at all.

**Evidence (measured, §2.6).**
- `select 1 as one; \! touch <file>` ran a shell command through `script()` and through the probe
  wrapper, unflagged.
- `\gexec`, `\c`, `\set`/`:var` and `\i` pass `TRANSACTION_CONTROL`.
- M1, a committing drift whose residue its probe reads, went red.
- **M2, a committing drift whose residue no rule reads, went green** (38 jobs, 0 failures), with a
  parameter grant left behind that makes V3 live on that database for the rest of migrate-clean and
  rls-smoke.

**Why LOW.** Every route needs a committed edit to repository SQL or to `run.mjs` that passes review,
and a PR can already change `run.mjs` itself. The static rule's stated guarantee is "A migration is SQL
and nothing else". It does not hold for a mid-line command, and that command runs on CI and developer
hosts.

**Remedy.**
- One quote-aware scan: outside single-quoted literals, dollar-quoted bodies, double-quoted
  identifiers and comments, no backslash at all. Apply it to migrations, replacements, fixtures,
  helpers **and every `selfTests[].drift`**. The probes' own SQL carries `'%\_by'` inside a literal,
  so a naive "no backslash" rule would refuse the coverage probe.
- Narrow `TRANSACTION_CONTROL` to statement position, so that a drift can be a `DO` block or a
  function-body replacement.
- My N5 remedy's "refuse a drift line beginning with a backslash" was insufficient as I wrote it.

### V5: NOTE. `decided_at` is the transaction's start, not the statement's

**What.** `new.decided_at := pg_catalog.now()` (`125_...sql:58`) is `transaction_timestamp()`.

**Evidence (measured, §2.4).** A decider whose transaction opened before a request existed recorded a
decision 1.03 s before the request's `created_at`, 3.01 s before the decision was actually written.

**Why NOTE.** The bound is however long the decider holds a transaction open. Through PostgREST a
transaction is one request.

**Remedy.** `pg_catalog.statement_timestamp()`, with the two cases comparing against it. Optionally a
CHECK `decided_at >= created_at`.

### V6: NOTE. The attribution coverage rule is UPDATE-only and name-based

**What.** `CLOSURE_COVERAGE_PROBE_SQL` (`run.mjs:222-238`) reads `has_column_privilege(..., 'UPDATE')`
on columns named `*_by`.

**Evidence (measured, `cov.mjs`).** A new client-updatable `reviewed_by` fails it by name. A new
client-**insertable** `reviewed_by` passes, and so does an updatable `approver`. As built, no
client-insertable `*_by` column exists besides `created_by`, `updated_by` and `requested_by`.

**Remedy.** The INSERT half of my N3, when `created_by`'s closure (blocker 186, owed) lands. Before
that, it would fail on `created_by` by design.

### V7: NOTE. Three recording gaps

1. Blocker 190 omits my N6.g: "the head must contain the current main" has no named mechanical
   check. Its item (a) has a parenthetical displaced between F9(g) and F9(g)'s own explanation.
2. Blocker 186 item (4) is closed while my N5's meta-command half is open (V4).
3. Blocker 186's "refuses any change to a recorded decision for every writer" overstates (V1).

### V8: NOTE (for C0/Q0; no false green). A missing object makes the verdict print the wrong reason

In RP-drop the verdict printed "its self-test after drift 1 failed with 42704 ... a rule that cannot
fail asserts nothing" for a policy that no longer exists. In RT-disable and RT-replica, the trigger
probe's drifts 2-4 were each reported as "a rule that cannot fail", because the new first raise fired
first. Each verdict is red and the "as built" line names the real cause. The extra lines could send a
reader after the wrong one.

## 5. Stop-the-line verdict

**No stop-the-line condition found in `43f4d96` / `d85a643`.**

- **Tenant leakage: none.** The new policy is restrictive and can only narrow. The trigger touches
  only the row being written. The other tenant's owner changed 0 rows on every path (§2.3, §2.4).
  rls-smoke passes 990 of 990.
- **Secret or customer-data exposure: none.**
  - the scanner exits 0;
  - no credential, address or connection-string shape appears in the added lines;
  - the trigger's error is a constant with no DETAIL (§2.7);
  - the fixtures are synthetic.
- **Migration divergence: none.** Only a new migration is added, and 125 is not integrated. The new
  drifts leave no catalog residue under client kills, backend crashes or an immediate shutdown (§2.6).
  M2's residue needs an edited drift that does not exist.
- **Contract mismatch: none.** Every legitimate flow keeps its row counts. The only client-visible
  change is that `decided_at` is ignored at a decision and no longer needs to be sent.

**Should any security finding block the Owner's merge? No.**

- V1-V4 are LOW, and none is live on the clean set. V5-V8 are NOTE. None is a condition I place on
  this PR.
- RFC-2026-002 clause 4 and RFC-2026-025 §5 item 6 speak of an "unresolved security finding". I
  recommend that V1-V4 be recorded before the merge, V2 on the batch 160 blocker and the others on
  blocker 186, so that none is open and unrecorded when the Owner presses the button. Whether
  recording resolves a finding is the Owner's reading (my N6.e).
- **Not a security finding, for the Owner and the Integration Owner.** The disposition's §4 records
  that A0 pressed #162's merge on the Owner's third instruction, and that §5 item 6's literal sentence
  was not met. The instruction this run's harness relays is those same words. Blocker 190 carries the
  point. For 125 the disposition says the Owner presses (§3.3). This PR also edits blocker 190's
  text, and whether that makes it a governance PR under §5 item 6 is the Owner's reading.
- No Integration Owner evidence exists for the package (blocker 189). That is a gate matter.

## 6. Limits of this run

- The shim is not Supabase. I measured policies, grants, triggers, constraints and the runner, not
  the platform or PostgREST.
- The identities were the fixture's. The settled-row matrix used the one approved request in
  workspace A. The time matrix used one pending request, plus workspace A's four for the counts.
- R3c, L, P, O and A are the widenings I tried. They show the closure holds against these, not
  against every edit. The closure itself is pinned by text.
- The command-path rows (K1-K7) sketch an amendment RFC-2026-023 has not approved. They show what the
  trigger and the closure bind, not RFC-2026-023's final shape.
- The pinned-policy drift's backend-crash case rests on the immediate shutdown only (§2.8).
- I did not run `npm run check`, the handoff guard, the branch-scope guard or the role-separation
  validator. Those belong to C0, Q0 and the Integration Owner. I ran the two static suites the change
  touches and the secret scan, on the branch name.
- This file's name does not match the pattern RFC-2026-024's §0 guard reads
  (`repository-json.test.mjs:167`, `^a1-security-...`). The brief named this path, and the disclosure
  is in §0 regardless.
- The Author wrote this brief, and I am the same model family (§0).
- The cluster on 5501 is stopped and its data directory removed. `140_audit.sql` is byte-identical to
  the head's. My scripts and logs stay in my private scratch directory. This file is the only change in
  my worktree.
