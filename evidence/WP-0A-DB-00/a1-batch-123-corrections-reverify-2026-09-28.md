# A1 Security/Privacy re-verification: batch 123's corrections (`f429fe6`, handoff `f2c1a54`)

Run: `/claude/a1_bastion`
Role: independent Security/Privacy reviewer for `WP-0A-DB-00`
Subject: the corrections commit on branch `agent/claude/WP-0A-DB-00-batch-123`: `f429fe6` (fix) and
`f2c1a54` (handoff, alone), on top of `8ba29d0`. I checked `f2c1a54` out as the local branch
`review/a1-batch-123-fix`.
Why: RFC-2026-025 §5 item 2 (approved 2026-09-28). A commit added after the role runs, answering their
findings and touching a migration, scripts and cases, is re-verified by all required role runs before
merge.
Author: `/claude/a0_atlas`
Date: 2026-09-28
Previous review: `a1-batch-123-security-review-2026-09-28.md` (on `5856f0b`).

**This document records review findings. It advances no package status, signs nothing on anyone's
behalf, writes `security_approved` nowhere, and repairs nothing it found.** It is one input to the
Product Owner's disposition. It is not the disposition.

---

## 0. What I am, before anything else

I am a subagent spawned by `/claude/a0_atlas`, the Author of the change under review. I ran in A0's
worktree, under a brief A0 wrote, and I am the same vendor and model family as A0. RFC-2026-024
withdrew the cross-vendor condition, so that fact does not by itself disqualify this review. It does
mean the Author chose what to point me at. Whether this re-verification counts as the Security
signature on the corrections is for the Integration Owner (`/claude/r0_steward`) and the Product Owner
to decide. It is not for me or for A0 to decide.

The corrections answer my own F3 from the previous review, and the closure they add is my F3 remedy 1,
nearly word for word. So I am reviewing my own remedy and have a stake in calling it sufficient. To
offset that, I went past the remedy. I tried to break the property it is meant to hold ("who decided
is the caller"), and I report one way it does not hold that my remedy itself missed (N1).

Every claim below either names the file and line it rests on or was measured on a live cluster. §2
separates what I measured from what I only read or inferred.

## 1. What was reviewed

`git diff 8ba29d0 f2c1a54`, read in full: 24 files, +664/−131. The parts that carry security weight:

- `db/foundation/migrations/123_attribution_closures_everywhere.sql`:
  - the new RESTRICTIVE UPDATE closure `approval_requests_decided_by_on_update_is_caller` (:78-80),
    with its comment (:38-45);
  - the apply-time block, which now asserts 090's `approval_requests_decision_has_a_decider` by
    definition text (:139-146) and the closure's exact shape (:149-157);
  - the removed fixed count (:125-128).

  123 is not on `main` (`git show origin/main:…123…` fails), so editing it rewrites no integrated
  migration. No other migration changed.
- `scripts/db/run.mjs`:
  - `closureRule` (:173-195);
  - `DECIDER_CLOSURES` and its probe (:207-209);
  - `PINNED_CHECKS` and its probe (:236-252);
  - the split into nine probes, each with one self-test drift per raise (:369-426);
  - `catalogProbeJobs` and `decideCatalogProbes` (:428-460);
  - the executor, unchanged: `rerun = (sql) => feed(\`begin;\n${sql}\nrollback;\n\`)` (:1713).
- `tests/db/identity/run-isolation.mjs:233-247`: `assertRejectedWith` and its new `violates` argument.
- `tests/db/identity/isolation-cases.mjs`: nine new cases and one rewritten case.
- `tests/db/identity/identity-isolation.test.mjs` and `test-kits/db/foundation-contract.test.mjs`.
- Six post-migrate replacements, `superseded.json`, the README probe section.
- RFC-2026-025 §5 (:64-113) and its status line (:3). Also the disposition file's §5, the one-page
  summary correction, the ninth-pass record, the manifest's rationale and blocker 186 (1-based
  index 186 of 188 in `open_blockers`), the handoff, and A0's integration record.
- For context, and unchanged: `db/foundation/migrations/090_approval.sql:563-595` (the cancel and
  decide policies) and `db/foundation/invariants/090_approval.1.sql:147-168, 281-316`.
- `architecture/decisions/RFC-2026-023-acting-user-narrowing.md` §3.1 and §3, for the worker and
  command question.

## 2. Method: measured vs inferred

### 2.1 Setup

**Measured.** I used a private PostgreSQL 17 cluster (`/opt/homebrew/bin`) on `127.0.0.1:5501`, TCP
only (`-c unix_socket_directories=''`), `initdb --locale=C -A trust -U postgres`, with
`LC_ALL=C TZ=UTC` and `TMPDIR` inside my private directory `…/scratchpad/a1-123f/`. Node was
`v24.20.0` (`.node-version` 24.20.0). The cluster was re-initdb'd for every round. Each round did the
following:

1. Copied the pristine `140_audit.sql` back.
2. Appended the round's drift, if it had one.
3. Applied `db/foundation/ci/supabase-shim.sql`.
4. Ran `DB_TEST_URL=postgresql://postgres@127.0.0.1:5501/postgres make db-migrate-clean`, then
   `make db-rls-smoke`.
5. Restored `140_audit.sql` byte for byte.

`140_audit.sql` hashes `2ac596bb…c1ad37149` before the first round, after every round and at the end.

Behavioural scripts ran on migrated, fixture-loaded clusters. They took identities with
`set_config('request.jwt.claims', …)` and `set_config('role', …)`, the way the repository's helpers
do. Every attempt ran in its own transaction and was rolled back. Where an attempt needed a drift, it
created it as `postgres` inside that transaction.

Ports: 5432 was not listening at any point. 5499 was held by another run (pid 78505), and I never
connected to it.

**Static suites, on the branch name `review/a1-batch-123-fix`:**
- `node --test test-kits/db/foundation-contract.test.mjs`: 71 of 71.
- `node --test tests/db/identity/identity-isolation.test.mjs`: 302 of 302.
- `node scripts/scan-repository-secrets.mjs`: exit 0.

A grep of every added line of `git diff 8ba29d0 f2c1a54` for address, credential, token, key and
connection-string shapes found none.

### 2.2 Rounds

| Round | Drift appended to 140 | migrate-clean | rls-smoke | What caught it |
|---|---|---|---|---|
| R0head, R0b | none | ok: nine probes, each refused each of its drifts (1+1+1+1+1+1+1+2+4); 44 blocks, 34 as written, 10 replaced | ok, 986 | none needed |
| R1 | the decide policy's two caller bindings gutted with `… OR true` (Q0 E19b's class) | ok | ok, 986 | nothing needs to: the closure refuses the forgery (§2.3) |
| R2 | R1 plus the decider closure dropped | **FAIL**, decider closure probe: `app.approval_requests has no approval_requests_decided_by_on_update_is_caller` | **FAIL**, 2: the two `…naming-another-decider` cases | both |
| R3 | a third permissive UPDATE policy admitting settled rows to the owner, no status bound | **FAIL**, 090's replacement: "does not bound the status it writes" | FAIL, 1 | both |
| R6 | a third permissive UPDATE sibling, role test only | **FAIL**, 090's replacement, same raise | FAIL, 6 | both |
| R3b | `status = 'pending'` removed from the decide policy's USING | ok | **FAIL**, 1: `approver-a-cannot-redecide-a-settled-approval-request` | rls-smoke only |
| **R3c** | the decide policy's USING widened to admit a settled row **for the owner only**: `… AND (status = 'pending' OR role = 'owner')` | ok | **ok, 986** | **none** (N1) |
| R4 | `grant insert (status, decided_at, decided_by) on app.approval_requests to authenticated` | **FAIL**, 090's replacement: "can be INSERTED with a state or a decision already on it" | FAIL, 1: `owner-a-cannot-raise-an-approval-request-already-decided` | both |
| R5 | the decider closure re-pointed `TO public` | **FAIL**, decider closure probe | ok | probe |

### 2.3 The decider matrix (head, clean set, `R0head` cluster)

**Measured.** I made 339 attempts, each rolled back.

- **Identities (15):** owner, admin, editor, page-scoped editor, approver, viewer, suspended member,
  the other tenant's owner, `authenticated` with no `sub`, `anon`, `service_role`, `app_worker`,
  `app_command`, and `postgres` for reference.
- **Clean paths (13):**
  - approve, request changes and cancel, each naming another member (C1-C3);
  - approve, request changes and cancel as self (C4-C6);
  - expire (C7);
  - `MERGE … WHEN MATCHED THEN UPDATE` naming another and naming self (C8, C9);
  - a CTE `update … from` (C10);
  - a row constructor `set (…) = row(…)` (C11);
  - `INSERT … SELECT … ON CONFLICT (id) DO UPDATE SET decided_by = <other>` (C12);
  - rewriting the decider of the settled request `approval_request_a1_decided` (C13).
- **Paths with a drift created inside the attempt (9):**
  - a looser permissive sibling `using (true) with check (true)`, `TO authenticated` (L1-L5) and
    `TO public` (L6);
  - the decide policy's bindings gutted with `or true` (O1);
  - the decide policy opened entirely (O2, O3).
- **Controls (2):** the closure dropped plus a loose sibling (X1); an INSERT grant on the decision
  columns (G1).
- **The future command and worker paths (S1-S3):** see Q1.

| Class of attempt | Client attempts | Changed rows | Outcome |
|---|---|---|---|
| Naming **another member** as decider (C1, C2, C3, C8, C10, C11, L1, L2, L6, O1, O2) | 99 | **0** | 30 refused by `approval_requests_decided_by_on_update_is_caller` **by name**; 30 refused by the permissive halves; 39 reached no row (viewer, suspended, other tenant, no `sub`) |
| The same, `anon`, `service_role`, `app_worker`, `app_command` (all paths) | 96 | 0 | `permission denied for schema app`, or for the table (`app_worker`) |
| Upsert (C12) | 9 | 0 updates | `id` is not in the INSERT grant, so nothing can conflict. Writers inserted a **new pending row with no decider** (`INSERT 0 1`, row read back); others were refused or reached nothing |
| Settled row: rewrite decider to **self**, erase the decision, re-decide as self (C13, L3, L4, L5, O3) | 45 | **24**, all under a drift (L3-L5, O3); **0** on the clean set (C13) | see N1 |
| X1 (closure dropped + loose sibling) | 9 | owner 4, admin 3, editor 3, page editor 2, approver 3, viewer 4 | the closure is what refuses L1 |
| G1 (INSERT grant, in-transaction) | 9 | writers `INSERT 0 1` with `status = approved`, `decided_by` = the approver | refused at migrate-clean by 090's replacement (R4) |

**Legitimate flows are unchanged in row counts:**
- approve as self: owner UPDATE 4, approver UPDATE 3;
- request changes as self: 4 and 3;
- `MERGE` approve as self: 4 and 3;
- plain cancel: owner 4, admin 3, editor 3, page editor 2.

These are the counts my review of `5856f0b` measured for the same statements. rls-smoke passes 986 of
986.

**Under R1 (the decide policy's bindings gutted)**, re-measured on that round's cluster: owner and
approver naming another member through UPDATE, MERGE, CTE and row constructor are each refused by the
closure by name, and approve as self still returns UPDATE 4 and 3.

**Under R3c**, on that round's cluster, as the owner against the approver's settled approval:

| Attempt | Result |
|---|---|
| T1: keep `approved`, set `decided_by` = self | **UPDATE 1**, the decision now names the owner |
| T2: `changes_requested`, `decided_by` = self, `decided_at = '2001-01-01'` | **UPDATE 1** |
| T3: overturn while keeping the approver as decider | refused |
| T4: the approver, same row | UPDATE 0 |

### 2.4 The self-test drifts: residue and interruption

**Measured, on a fresh cluster (R0b) after a clean `migrate-clean`.** A driver script in my private
directory imported the runner's own `CATALOG_RULE_PROBES`, `catalogProbeJobs` and
`decideCatalogProbes`, and the driver's own `feed`. It ran the jobs exactly as `run.mjs:1713` does,
`begin; <job>; rollback;`, and I interrupted it:

- **16 client-side interruptions.** The driver and its psql child got SIGKILL or SIGINT after
  0.05 to 2.3 s, in a 40-loop run of the trigger probe. The interruptions landed in "as built" and
  in each of drifts 1 to 4, including drift 3 (`alter role authenticated set session_replication_role
  = 'replica'`) and drift 4 (`create table app.probe_child_of_security_events () inherits
  (app.security_events)`).
- **2 backend SIGKILLs**, each while drift 3 or drift 4 was held open in a transaction by
  `pg_sleep`. Each forced a crash restart.
- **1 `pg_ctl stop -m immediate`** with both drifts open, then a restart.

After every one:

- `pg_db_role_setting` had 0 rows;
- no `probe_child_%` relation existed;
- no `pg_inherits` row existed on `audit_logs` or `security_events`;
- no trigger outside the system schemas was disabled;
- `refuse_truncate` on `audit_logs` was present;
- no other backend was in a transaction.

While drift 3 was open, a second session read `pg_db_role_setting` as 0 rows, because the drift was
uncommitted. After everything, one uninterrupted pass of all 22 jobs gave `verdict ok=true jobs=22
failures=0`.

The only trace is on disk. The two crashed `CREATE TABLE`s, and the one in the immediate shutdown, left
nine relation files with no `pg_class` row: heap, toast and toast index, 0 or 8192 bytes each (an
empty btree metapage). Leaving orphaned relation files after a crash is PostgreSQL's documented
behaviour. They hold no row data, because the child table was never written.

**Non-superuser, measured.** A role with CREATEROLE and ADMIN on `authenticated` running drift 3 got
`permission denied to set parameter "session_replication_role"`. On a test database whose connection
is not a superuser, the trigger probe's self-test therefore fails the verdict with 42501. That is
loud, and it leaves no residue.

### 2.5 What the probes and the new error paths print

**Measured.** I collected the error text each of the 22 jobs returns: what `decideCatalogProbes`
prints on a failure. Every message names catalog objects only: constraint, policy, function, trigger,
role or database names, and `tgenabled` and FK action letters. None carries a setting value, a
function body or row data.

- In a rolled-back transaction I set a **synthetic** `app.settings.jwt_secret` beside a
  `session_replication_role` default on the database and ran the trigger probe. It raised
  `session_replication_role is set as a default for: <every role>/[redacted]`. The synthetic value
  was absent, and the driver's `redactConnection` removed the database name, because it is part of
  the URL.
- `violates` prints `result.error.message` on a name mismatch (`run-isolation.mjs:238-241`). Through
  the session driver rls-smoke uses, that message is PostgreSQL's primary message
  (`:LAST_ERROR_MESSAGE`). For the pair's 23514 it was `new row for relation "approval_requests"
  violates check constraint "approval_requests_decider_is_a_pair"`, for the editor and for
  `postgres` alike, with no `Failing row contains` and no identifier.

### 2.6 Read or inferred, not measured

- That the shim behaves as Supabase does for these policies (`supabase-shim.sql:1-18` says it is not
  Supabase).
- Everything in Q5 and N6 about RFC-2026-025. I read the text. I executed no delegated or
  record-only merge.
- N3 and N4 rest on reading `run.mjs`. For N4 I measured one branch firing (R2), not the absence of
  a per-run proof for each predicate.
- N5's "a drift containing `commit` would persist" is PostgreSQL semantics plus reading the tests. I
  did not edit `run.mjs` to demonstrate it.

## 3. The brief's questions, answered

### Q1. Can an owner, approver, admin or editor record another member as decider through any path? Does the closure refuse a legitimate or future flow?

**No path I could find records another member as decider, on the clean set or under any single drift
short of dropping the closure.** Measured in §2.2 and §2.3:

- **UPDATE, MERGE, CTE, row constructor:** 0 of 99 client attempts changed a row.
- **INSERT … ON CONFLICT DO UPDATE:** not a path. `id` is not client-insertable, so nothing
  conflicts, and the statement inserts a new pending row with no decider. `decided_by`,
  `decided_at` and `status` are in no INSERT grant. A later grant of them is refused at
  `migrate-clean` by 090's replacement (`090_approval.1.sql:147-168`; R4).
- **A looser permissive sibling in a later migration:** refused twice. 090's replacement fails the
  file (exactly two permissive UPDATE policies, each bounding `status`; `:281-316`; R3, R6). And
  inside a transaction, where no block runs, the closure refuses it by name (L1, L6, including a
  sibling `TO public`).
- **`or true` on the decide policy:** every layer stays green (R1), which is correct, because the
  closure refuses the forgery by name.
- **Dropping or re-pointing the closure:** fails `migrate-clean` by name (R2, R5). The two new cases
  fail too (R2).

**What the closure does not hold (N1).** It binds the decider to the caller *at the moment of a
write*. It does not make a settled decision immutable. Where any permissive policy admits a settled
row, a caller can overwrite the real decider with themselves, erase the decision, or re-decide it,
because `decided_by = auth.uid()` or `NULL` satisfies the closure. On the clean set nothing admits a
settled row (C13: 0). The one route I measured that passes every layer is R3c.

**Legitimate flows.** The closure refuses none that exists: identical row counts on every positive,
and 986 of 986.

It does constrain a future **client** flow that updates a settled row decided by someone else, for
example an owner annotating or archiving an approved request. Such an update is refused unless it also
rewrites `decided_by` to the caller or to NULL. So the closure's shape pushes any future "amend a
decision" policy toward exactly the takeover N1 describes. That is a reason to make settled rows
immutable explicitly, not a reason to loosen the closure.

**Future worker and command paths (RFC-2026-023).** The closure constrains neither, because it is
`TO authenticated`:

- **`app_worker`**, even with an UPDATE grant and a permissive `using (true) with check (true)`
  policy, reaches 0 rows (S3). 092's `approval_requests_service_path_closed` (restrictive, `TO
  PUBLIC`, `current_user = 'authenticated'`) refuses every other role.
- **`app_command`, under an RFC-2026-023 shape-B-like amendment of that closure** (sketched in the
  transaction, with an UPDATE grant and an open policy), with the approver as the acting user,
  approved four requests naming the **owner** as decider (S1, UPDATE 4). The decider closure does not
  apply to that role. The same holds for every attribution closure in this schema.

So the closure does not refuse anything RFC-2026-023 would need. It also protects nothing on that
path, and RFC-2026-023 as written does not say to extend it (N2).

### Q2. Do the new self-test drifts leave residue, in CI or locally? Is anything printed that should not be?

**No catalog residue, measured under every interruption I could produce** (§2.4). This is structural:

- the executor never commits (`run.mjs:1713`, pinned by `foundation-contract.test.mjs:2457`);
- `ALTER ROLE … SET` and `CREATE TABLE … INHERITS` are both transactional;
- the driver runs psql with `ON_ERROR_STOP=1`, so an error closes the connection, and PostgreSQL
  aborts an open transaction on disconnect or crash.

In CI the container is discarded anyway. Locally, `pg_db_role_setting` is cluster-wide, so a
committed drift 3 would reach every database in a developer's cluster. It cannot commit through this
executor. Nothing forbids a future drift from carrying its own `commit` (N5).

Two harmless side effects:
- empty orphaned relation files after a crash in drift 4;
- on a non-superuser test connection, a loud 42501 from drift 3.

Nothing printed carries settings or row data (§2.5).

### Q3. Does the `violates` check or any new error path leak anything?

**No.** Measured in §2.5:

- The `violates` mismatch prints PostgreSQL's primary message, which names the relation and the
  constraint and carries no row values, for a client and for the superuser.
- `decideCatalogProbes`' new failure line prints a probe label only
  (`run.mjs:444`).
- The probes' own raises print catalog names only.

The match is on the quoted constraint name, not the relation. That is a precision point for Q0, not
a leak.

### Q4. Is F4/F5/F6's recording in blocker 186 accurate, and graded as I graded it?

**Accurate in substance. No grade is stated for F4, F5 or F6** in blocker 186, the handoff's
`known_limitations` or A0's integration record §3, so none is misgraded. For the record, my grades
were **F4 LOW, F5 LOW, F6 NOTE**. Blocker 186 does state F3's grade as I gave it ("LOW; the Owner may
reasonably call it MEDIUM").

Checked against my file:
- F4: "2001 and 2999 were both accepted", and batch 160 reads the value;
- F5: "22 permissive INSERT policies on 17 tables, `or true` on all of them fails 1 of 977 cases",
  and the cases forge `updated_by` too;
- F6: a `public` table passes every layer.

All three are faithful. Blocker 186 folds F6 together with Q0 F6 (`app_worker`) under "the service
half is RFC-2026-023's question". My F6 was about schema `public`, not the service role, but the
sentence names both, so nothing is lost. The one-page summary's verbatim quote of my 105 remedy
("Split the CHECK so that each column is tied to the status on its own") matches
`a1-batch-105-security-review-2026-09-27.md:263`.

**One item from my F3 is not recorded anywhere.** Remedy 2 had two halves. The pin was done
(`DECIDER_CLOSURES`). The live coverage rule over every client-writable `*_by` column, in both verbs,
was neither done nor recorded (N3).

### Q5. RFC-2026-025 §5 against my F8 and F9: is each item reflected? Is there a remaining loophole?

**Most are reflected, several more strictly than I asked.** The interim rule "until item 5's check
exists, no PR is treated as record-only" (:69) closes the record-only route for now.

| My item | §5 | Status |
|---|---|---|
| F8.1 blocker text is the risk register; F8(b) | item 1: removing or rewording an open blocker is not record-only (the manifest's `open_blockers` is not in the covered list at all) | reflected, stricter |
| F8.2 manifest fields; branch-scope reads the PR's head | item 1 "any other manifest field"; item 5 "not a licence" | reflected |
| F8.3 role verdicts and dispositions; F8(c) | item 1 excludes them | reflected |
| F8.4 state records steer the next run | item 1 still exempts `session-*.md` | **partly** (N6.c) |
| F8.5 the scanner relaxes EMAIL in `evidence/` and `handoffs/` (`scan-repository-secrets.mjs:23-24`); F8(d) a light privacy reading | nothing | **not reflected** (N6.c) |
| F8.6 a test file in the list; F8(a) mechanical check | items 1 and 5 | reflected; the check does not exist yet and no owner of it is named |
| F9.1 / F9(a) fix commits re-verified | item 2 | reflected, with a routing gap (N6.b) |
| F9.2 / F9(b) RFC-002 clause 4 | item 6 bullet 2 | reflected, stricter; "unresolved" undefined (N6.e) |
| F9.3 / F9(c) head contains `main` | item 6 bullet 1 | reflected, not mechanical. Measured: `f2c1a54` contains `origin/main` `e276c9a` today |
| F9.4 / F9(d) delegation after the PR exists, in the PR | item 6 bullet 3, "or must name its sequence explicitly" | **partly** (N6.d) |
| F9.5 / F9(e) Integration Owner verdict | item 3 and item 6 bullet 4, "where the package's gates require it" | reflected. WP-0A-DB-00's gates include `integration_verified`, so it is required here, and item 3 records that no r0 evidence file exists (N6.h) |
| F9(f) governance PRs merged by the Owner; approved text pinned by digest | item 6 bullet 5 | first half reflected, and it applies to this PR; the digest half is not (N6.a) |
| F9(g) a stop-the-line finding revokes the rest of a sequence | §2 rule 2 still says "for that PR" (:41) | **not reflected** (N6.f) |

The remaining loopholes are listed as N6. None of them reaches this PR: §5 item 6 makes the Owner
merge it personally, so no delegation applies to it.

### Q6. Stop-the-line risks?

**None found in `f429fe6` / `f2c1a54`** (§5).

## 4. Findings

### Status of my earlier findings

- **F3 (decided_by at decision): CLOSED as measured, for the property I named.** A caller can no
  longer record another member as decider on any path, with the decide policy's binding gutted or a
  looser sibling present (§2.2 R1, R2, R5; §2.3). The closure is exactly my remedy 1
  (`123_…sql:78-80`). It is pinned by text (`run.mjs:207-209`), asserted at apply time (`123_…sql:149-157`),
  and has the case my remedy 3 named (`isolation-cases.mjs:13613`). My remedy 2's coverage half is
  N3, and the property my remedy did not state is N1.
- **F4, F5 (LOW) and F6 (NOTE): OPEN, recorded accurately** (Q4). I place no condition on them.
- **F7 (NOTE): addressed.** The fixed count and its wrong sentence are gone (`123_…sql:125-128`). The
  probe's pinned list still refuses a new table's closure, which is what H-D12 measured on
  `5856f0b`.
- **F8, F9: largely reflected in §5** (Q5). The residue is N6.

### N1: LOW (pre-existing since 090; narrowed, not introduced, by the corrections; a gap in my own F3 remedy). A settled decision can be taken over by whoever a policy lets update it, and the one guard is two clauses no layer pins against an owner-only widening

**What.** The closure's WITH CHECK binds `decided_by` on the new row to NULL or the caller
(`123_…sql:78-80`). It says nothing about the old row. "Approval history immutable" (§4 invariant 8)
rests on `status = 'pending'` in the USING halves of the two permissive UPDATE policies
(`090_approval.sql:567, 588`). Two rls-smoke cases read those clauses:
`approver-a-cannot-redecide-a-settled-approval-request` and
`editor-a-cannot-cancel-a-settled-approval-request` (`isolation-cases.mjs:13748, 13762`). Each case
runs as the identity its policy names.

**Evidence (measured).**
- With any policy admitting a settled row (the in-transaction L3-L5 and O3), every writer and the
  approver could:
  - set themselves as the decider of the approver's approval;
  - revert it to `pending` with no decider;
  - re-decide it as themselves.

  That is 24 of 24 such attempts by identities who reach the row. The closure admits all of it.
- **R3c**: a plausible later edit, "the owner may correct a decision", widening the decide policy's
  USING for the owner only. It passed `migrate-clean` (44 blocks) and rls-smoke (986 of 986). The
  owner then turned the approver's approval into the owner's own (T1, UPDATE 1), or overturned it
  as the owner, backdated to 2001 (T2, UPDATE 1).
- R3b, removing `pending` outright, is caught, but only by rls-smoke. A third permissive policy is
  caught by 090's replacement (R3, R6).

**Why it matters.** `decided_by` is the only record today of who passed the approval gate:
`approval_events` has no writer yet (`090_approval.1.sql` asserts it carries no write policy). My F3
remedy 1 said the closure "refuses nothing that works today … and no permissive policy admits an
update of a decided row". That was true as built, and not pinned.

**Why LOW.** It is drift-only: nothing reaches it on the clean set (C13: 0). It stays inside one
workspace, and under R3c only an owner can do it. The Owner may reasonably read it as MEDIUM for the
same reason as F3: it is the approval gate.

**Remedies (the Owner's choice):**

1. A restrictive closure in the same family, `approval_requests_settled_is_immutable`: `as restrictive
   for update to authenticated using (status = 'pending')`. Pin it by text beside the decider closure.
   It refuses nothing today, since both USING halves already require it. It makes §4 invariant 8 a
   closure rather than two clauses.
2. Or a BEFORE UPDATE trigger refusing any change to `decided_by` or `decided_at` once
   `OLD.decided_by` is set. It pairs naturally with F4's remedy (the database sets `decided_at`), and
   it binds every writer, not only clients.
3. An rls-smoke case as the **owner**: `owner-a-cannot-redecide-a-settled-approval-request`. With it
   R3c fails, whichever remedy is chosen.

### N2: NOTE (not live; for RFC-2026-023's disposition). The attribution closures bind `authenticated` only, so the command path RFC-2026-023 proposes would bind none of them

**What.** Every attribution closure, the new decider closure included, is `TO authenticated`
(`run.mjs:184` pins `polroles` to exactly that role). RFC-2026-023 §3.1 says that inside a command
function `auth.uid()` is still the acting user, and that §3's amendment admits `app_command` through
the service-path closures. Nothing in RFC-2026-023 extends the attribution closures.

**Evidence (measured).**
- **S1:** under a shape-B-like amendment sketched in a transaction, `app_command`, acting for the
  approver, approved four requests naming the owner as decider (UPDATE 4).
- **S3:** today `app_worker` reaches 0 rows even with a grant and an open policy, because 092's
  closure holds.

**Remedy.** When RFC-2026-023 is disposed, state that attribution closures extend to the command role
(`TO authenticated, app_command`), with the probes' pinned `polroles` updated in the same change, or
state why the command function's body is trusted to set them.

### N3: NOTE. My F3 remedy 2's coverage half was neither done nor recorded

**What.** `DECIDER_CLOSURES = ['approval_requests']` (`run.mjs:207`) is a pin, not a rule. The only
live coverage rule is for `updated_by` UPDATE grants (`CLOSURE_COVERAGE_PROBE_SQL`). A later table
with a client-updatable `decided_by`, or an `approved_by` or `reviewed_by`, and no closure, would
pass every catalog probe. INSERT grants on `approval_requests`' decision columns are held by 090's
replacement (R4), but only for that table. **Read, not measured.**

**Remedy.** A coverage probe in `CLOSURE_COVERAGE_PROBE_SQL`'s shape: every `app` table granting
`authenticated` INSERT or UPDATE on a column named `decided_by` must be in `DECIDER_CLOSURES`, with
its own self-test drift. Or record the gap on blocker 186 beside the `created_by` item.

### N4: NOTE. "Every rule is shown able to fail on every run" is true per raise, not per predicate

**What.** The static test counts `raise exception` occurrences and requires as many drifts
(`foundation-contract.test.mjs:2308-2314`). Several raises carry more than one predicate, and the one
drift exercises one of them:

- **each closure probe:** the "not in pinned shape" branch and the "`has no …`" branch
  (`run.mjs:173-195`); the drift reaches only the first;
- **the first SECURITY DEFINER raise:** five predicates (proconfig, PUBLIC EXECUTE, not pinned,
  owner, body digest); the drift reaches only proconfig;
- **the FK action raise:** on update, on delete, deferrable, NOT VALID;
- **trigger rule 4:** `relkind` and `pg_inherits`.

Each of these is pinned by the probe digest, so an edit to them is visible in review. R2 shows the
"has no" branch firing live today. What is not proven on every run is that a sub-predicate has not
become vacuous without an edit, for example after a catalog-representation change on a PostgreSQL
upgrade.

**Remedy (optional).** One drift per predicate for the security-bearing ones: a closure dropped, a
definer function granted to PUBLIC, and a definer owner change. Or say "per raise" in the README
sentence.

### N5: NOTE. No rule refuses transaction control inside a self-test drift, and one drift now writes a cluster-wide role default

**What.** The executor never commits (`run.mjs:1713`), and that is pinned
(`foundation-contract.test.mjs:2457`). A replacement block is also held to carrying no `commit`,
`rollback`, `savepoint` or `release` (`:2526-2528`, after C0 showed `end $$; commit;` would commit
past the rollback). No such assertion covers the `selfTests` drifts.

A drift that carried `commit;` would persist. Drift 3 writes `pg_db_role_setting` with
`setdatabase = 0`, a default for every database in the cluster, which disables every trigger for
sessions that apply role settings. Today none of the 13 drifts carries transaction control (read),
any edit changes a pinned digest, and §2.4 measured no residue under interruption. On a later run, a
committed drift 3 would also make the trigger probe fail as built, by name.

**Remedy.** Extend the `:2528` assertion to every `selfTests[].drift`. Optionally also refuse a drift
line beginning with a backslash, since `feed` runs on psql's stdin. That second point adds nothing a
PR could not already do in `run.mjs` itself.

### N6: LOW (governance; none of it reaches this PR, which the Owner merges personally). What RFC-2026-025 §5 leaves open

a. **The approved §5 text is not pinned.**
   - The Owner approved §5 (`อนุมัติ §5 ของ RFC-025`) before it was committed. It was committed in
     `f429fe6`, together with the code fix.
   - The disposition says A0 "reads this as approving §5 as it stood". No commit or digest records
     what stood.
   - The status line still says "§5 is the proposed amendment" (:3), while §5's heading says
     APPROVED (:64).

   Remedy: at the personal merge, the Owner confirms §5 as committed. The digest is
   `integrity-manifest.json`: `5f5a3dda7bc67d688c5450245a789ba775ae51b5daea42f52a973376f8fa4723`.
   The status line is corrected with the Owner's leave, since any change needs the Owner.

b. **Item 2's routing is the Author's classification, with a gap.** "Touches only that finding's
   scope" is decided by the Author. The all-runs trigger names a migration, script, case or fixture,
   and omits:
   - test files;
   - `db/foundation/invariants/*.sql` replacements and `superseded.json`, which can weaken the
     post-migrate pass;
   - the manifest's `ownership` and gate fields.

   A commit that is in neither class falls through. Remedy: default to all required runs unless the
   commit is record-only by item 5's check.

c. **State records and the handoff stay exempt, with no privacy reading.** Item 1 still covers
   `session-*.md` and the handoff. A new session record that silently omits an owed security item is
   record-only. The blockers stay authoritative, which bounds the harm. The scanner still relaxes
   EMAIL for `evidence/` and `handoffs/` (`scan-repository-secrets.mjs:23-24`), so no one checks a
   record-only PR for a personal address. Remedy: my F8(d), one light privacy reading by any
   independent run or by the Owner.

d. **"Or must name its sequence explicitly" re-admits words given before a PR exists.** The
   disposition records that A0 reads `คุณลุยงานทั้งหมด ตามที่คุณแนะนำ` as covering batch 091, which
   did not exist then, and C0 noted it. Remedy: the sequence is named in the Owner's words or in the
   PR, by PR number or head SHA, before the merge.

e. **"Unresolved" is undefined** (item 6 bullet 2). Remedy: a security finding is resolved when fixed
   and re-verified, or when its reviewer states it is not a condition **and** it is recorded as a
   blocker before the merge.

f. **A stop-the-line finding still revokes the delegation only "for that PR"** (§2 rule 2, :41), not
   for the rest of a stated sequence (my F9(g)).

g. **"The head must contain the current main"** has no named mechanical check. Remedy:
   `git merge-base --is-ancestor origin/main <head>`, quoted in the merge record.

h. **The Integration Owner's verdict is required here and absent.** The package's gates list
   `integration_verified`, and item 3 records "no r0 evidence file". RFC-2026-002 clause 2 requires
   an Integration Owner verdict per merge, and clause 4 says an unmet package gate blocks the merge.
   This is a gate question for the Owner and `/claude/r0_steward`, not a security finding.

## 5. Stop-the-line verdict

**No stop-the-line condition found in `f429fe6` / `f2c1a54`.**

- **Tenant leakage: none.** The new policy is restrictive, with no USING, so it can only narrow. The
  other tenant's owner reached 0 rows on every path (§2.3). rls-smoke passes 986 of 986.
- **Secret or customer-data exposure: none.**
  - the scanner exits 0;
  - no credential, address or connection-string shape appears in the added lines;
  - probe and `violates` messages carry catalog names only, measured with a synthetic secret-shaped
    setting present (§2.5);
  - fixtures are synthetic.
- **Migration divergence: none.** Only 123 changed, and 123 is not integrated. The self-test drifts
  leave no catalog residue under client kills, backend crashes or an immediate shutdown (§2.4).
- **Contract mismatch: none.** Every legitimate flow keeps its row counts. The only behaviour change
  is that naming another member as decider is refused by a closure no sibling policy can widen.

**Should any security finding block the Owner's merge? No.**

- N1 and N6 are LOW. N2 to N5 are NOTE. F4 and F5 are LOW and F6 is NOTE, as before.
- None is a condition I place on this PR. N1 predates 123. It is drift-only, and the corrections
  narrowed it from "anyone" to "self or nothing".
- RFC-2026-002 clause 4 and §5 item 6 bullet 2 speak of an "unresolved security finding". I recommend
  that N1, and N2 to N5 at the Owner's discretion, be recorded on blocker 186 before the merge, so
  that none of them is open and unrecorded when the Owner presses the button. Whether recording
  resolves a finding is the Owner's reading (N6.e).
- The absent Integration Owner verdict (N6.h) is a gate matter, not a security one.

## 6. Limits of this run

- The shim is not Supabase. I measured policies, grants, constraints and the runner, not the platform.
- My identities were the fixture's. The approval matrix used workspace A's four pending requests and
  its one approved request.
- R3c is one widening among many possible ones. I show that one passes every layer, not that it is
  the only one.
- The command-path measurement (S1) sketched an amendment RFC-2026-023 has not approved. It shows the
  closure's role scope, not RFC-2026-023's final shape.
- I did not run `npm run check`, the handoff guard, the branch-scope guard or the role-separation
  validator. Those belong to C0, Q0 and the Integration Owner. I ran the two static suites the fix
  changed, on the branch name.
- This file's name does not match the pattern RFC-2026-024's §0 guard reads
  (`repository-json.test.mjs:167`, `a1-security-…`). That is the gap C0 F10 recorded. The disclosure
  is in §0 regardless.
- The Author wrote this brief, and I am the same model family (§0).
- The cluster on 5501 is stopped and its data directory removed. `140_audit.sql` is byte-identical to
  `8ba29d0`'s. My scripts and logs stay in my private scratch directory.
