# A1 Security/Privacy review: the four catalog-rule probes

Run: `/claude/a1_bastion`
Role: independent Security/Privacy reviewer for `WP-0A-DB-00`
Subject: branch `agent/claude/WP-0A-DB-00-catalog-rule-probes`, head `055b977`, base `9039738` (`main`).
I checked it out as the local branch `review/a1-catalog-probes` in an isolation worktree.
Author: `/claude/a0_atlas`
Date: 2026-09-27

**This document records review findings. It advances no package status, signs nothing on anyone's
behalf, writes `security_approved` nowhere, and repairs nothing it found.** It is one input to the
Product Owner's disposition. It is not the disposition.

---

## 0. What I am, before anything else

I am a subagent spawned by `/claude/a0_atlas`, the Author of the change under review. I ran in A0's
worktree, under a brief A0 wrote, and I am the same vendor and model family as A0. RFC-2026-024
withdrew the cross-vendor condition, so that fact does not by itself disqualify this review. It does
mean the author chose what to point me at. Whether this review counts as the Security signature is
for the Integration Owner and the Product Owner to decide. It is not for me or for A0 to decide.

What makes up for that: every claim below either names the file and line it rests on or was measured
on a live cluster, and each measurement can be re-run. §2 separates what I measured from what I
only inferred. I went beyond the brief's list where the evidence led (F1 was not in the brief).

## 1. What was reviewed

- `git show 055b977`: 11 files. The four probes are `scripts/db/run.mjs:116-242`
  (`FK_ACTION_PROBE_SQL` :129, `CLOSURE_TEXT_PROBE_SQL` via `closureRule` :161, 
  `SECURITY_DEFINER_PROBE_SQL` :193, `TRIGGER_PROBE_SQL` :215, `CATALOG_RULE_PROBES` :237). They
  are wired into `migrate-clean` at `run.mjs:1495-1499`. The change also adds the README section
  (`db/foundation/README.md:320-338`) and one contract test
  (`test-kits/db/foundation-contract.test.mjs:2233-2264`). It moves floors and digests, and it edits
  two blocker texts and the branch slot in `work-packages/WP-0A-DB-00.json`.
- The plan `a0-catalog-rule-probes-plan-2026-09-27.md`, the disposition
  `product-owner-disposition-2026-09-27-catalog-rule-probes.md`, the survey
  `weak-assertion-survey-2026-09-27.md` §5, and my own
  `a1-post-migrate-pass-security-review-2026-09-27.md` (F3).
- `scripts/db/psql-driver.mjs` (`script`, `redactConnection`) and
  `db/foundation/migrations/{000,020,030,040,100,102,140}_*.sql` where cited.

**The claim that no schema, policy or grant changed is true.** I measured it:
`git diff --stat 9039738 055b977 -- db/foundation/migrations db/foundation/invariants db/foundation/ci db/foundation/test-helpers tests .github Makefile package.json package-lock.json`
is empty. The probes are read-only catalog queries, each sent through `script()`, which wraps them in
`begin; … commit;` (`psql-driver.mjs:268-270`).

## 2. Method: measured vs inferred

**Measured** on a private cluster: PostgreSQL 17.11, `initdb --locale=C -A trust -U postgres`,
`127.0.0.1:5501`, TCP only (`unix_socket_directories=''`), `LC_ALL=C TZ=UTC`. It lived in my own
subdirectory `…/scratchpad/a1-probes/pgdata` and was re-initdb'd for every round. Each round did
the following:

1. Copied the pristine `140_audit.sql` back.
2. Appended one drift.
3. Ran the CI shim, then `DB_TEST_URL=postgresql://postgres@127.0.0.1:5501/postgres make db-migrate-clean`, then `make db-rls-smoke`.
4. For some rounds, ran a behavioural script as the owner `postgres` or as a fixture identity, with
   everything rolled back.
5. Restored `140_audit.sql`.

After the last round, `140_audit.sql` hashes to `2ac596bb…c1ad37149`, the same value as before the
first round. The cluster is stopped and deleted. Port 5432 was never touched: the user's server there
is still listening under the same pid 750.

On the clean set (R0): `migrate-clean` passes and prints all four probe claims, the pass reports
42 blocks, and `rls-smoke` passes 965 cases. `node --test test-kits/db/foundation-contract.test.mjs`
passes 68 of 68.

| Round | Drift appended to 140 (or state probed) | migrate-clean | rls-smoke | Which layer |
|---|---|---|---|---|
| R0 | none | ok | ok | — |
| M07 | my F3's M07 again: `industry_assignments_updated_by_is_caller` + `or true` | **FAIL** (closure text probe) | ok | new probe |
| N21 | my F3's N21 again: `assets_updated_by_is_caller` + `or true` | **FAIL** (closure text probe) | ok | new probe |
| C1 | `alter policy assets_updated_by_is_caller … to public` | **FAIL** (closure text probe) | ok | new probe |
| C2 | a second RESTRICTIVE insert policy `with check (true)` on assets | FAIL (100 replacement's exact restrictive set) | ok | pass. Harmless anyway: restrictive policies AND |
| C3 | the UPDATE policy `assets_update_writer` with `updated_by = auth.uid() or true` (tokens kept) | ok | **FAIL** (1: `owner-a-cannot-forge-the-actor-on-a-library-asset-rename`) | rls-smoke only |
| C3b | the same UPDATE check removed outright | ok | **FAIL** (1, same case) | rls-smoke only |
| C4 | `alter role authenticated bypassrls` | **ok** | **FAIL** (273) | rls-smoke only |
| C5 | `alter table app.assets disable row level security` | FAIL (100 repl., 101) | FAIL (16) | pass + rls-smoke |
| C6 | `auth.uid()` re-bodied to prefer a client-settable GUC `app.act_as` | **ok** | **ok** | **none** |
| C9 | `alter table app.assets no force row level security` | FAIL (100 repl., 101) | ok | pass. Irrelevant to the closure: `authenticated` is not the owner |
| S1 | `public.a1_definer_public()` SECURITY DEFINER, no search_path, `count(*) from app.security_events` | **ok** | **ok** | **none** |
| S2 | the same in a new schema `app_ext` | **ok** | **ok** | **none** |
| S3 | a definer in `app` with `search_path=""` whose body runs `set_config('search_path','public',true)` | **ok** | **ok** | **none** |
| S4b | a definer in `app` with `search_path=""`, owned by postgres, EXECUTE left to PUBLIC (the default), `count(*) from app.security_events` | **ok** | **ok** | **none** |
| S5 | a definer with `search_path=""` plus `set app.a1_fake_setting = 'A1-FAKE-VALUE-NOT-A-SECRET'` | **FAIL** (definer probe; **prints the value**) | ok | new probe (see F5) |
| T1 | `create or replace trigger refuse_mutation … on app.security_events … when (false)`, and the same for `refuse_truncate` | **ok** | **ok** | **none** |
| T2 | audit_logs: `refuse_mutation` `when (old.actor_id = 'migration.140.probe')`; `refuse_truncate` `when (private.a1_probe_present())` | **ok** | **ok** | **none** |
| T3 | `private.refuse_mutation()` re-bodied: returns OLD/NEW for `security_events`, raises for everything else | **ok** | **ok** | **none** |
| T4 | `alter database postgres set session_replication_role = replica` | FAIL (140 re-run, **via a CHECK 23514**, not ZZ140) | FAIL (fixture load) | pass + rls-smoke, by accident |
| T4b | `alter role app_maintenance set session_replication_role = replica` | ok | ok | none (the privilege layer still refuses; §3 F2) |
| T5 | `alter table app.security_events enable always trigger refuse_mutation` (stronger) | **FAIL** (trigger probe, `tgenabled A`) | ok | new probe, fail-closed on a stronger state |
| T6c | `create table app.a1_audit_child () inherits (app.audit_logs)`, RLS enabled and forced | **ok** | **ok** | **none** |
| T7 | `alter function private.refuse_mutation() owner to app_maintenance` | **ok** | **ok** | **none** |

Behavioural results (as `postgres`, the owner, each rolled back):

| Round | security_events UPDATE / DELETE / TRUNCATE | audit_logs UPDATE / DELETE / TRUNCATE / TRUNCATE ONLY |
|---|---|---|
| R0-shaped (C6, T4b, T5, T6c) | ZZ140 / ZZ140 / ZZ140 | ZZ140 / ZZ140 / ZZ140 / ZZ140 |
| T1 | **ACCEPTED / ACCEPTED / ACCEPTED** | ZZ140 ×4 |
| T2 | ZZ140 ×3 | 23514 (my UPDATE broke a CHECK) / **ACCEPTED / ACCEPTED / ACCEPTED** |
| T3 | **ACCEPTED / ACCEPTED / ACCEPTED** | ZZ140 ×4 |
| T4 | **ACCEPTED ×3** | 23514 / **ACCEPTED ×3** |
| T6c | — | a row in the child is visible through `app.audit_logs`, and `delete from app.audit_logs where …` returns **DELETE 1** |

Other measurements:

- **The UPDATE path on the clean set (F1).** After R0 plus `rls-smoke`, the fixture's owner of
  workspace `c4840acc…` (`request.jwt.claims.sub = 5c460eb8…`, role `authenticated`) ran
  `update … set updated_by = '<editor a324d4a6…>'` on one row each of seven tables.
  - Refused on none of `workspaces`, `workspace_settings`, `workspace_invitations`,
    `business_profiles`, `page_context_profiles`, `industry_assignments` and `knowledge_items`:
    `UPDATE 1`, with the forged value returned.
  - The same statement on `app.assets` was refused: `new row violates row-level security policy`.
  - A catalog query found the same thing for all 17 `app` tables where `authenticated` holds UPDATE
    on `updated_by`: those seven tables have no UPDATE or ALL policy whose WITH CHECK names
    `updated_by`. The other ten do.
  - No trigger rewrites `updated_by`. The only non-internal trigger functions are `set_updated_at`,
    which sets `updated_at` only (`000_foundation.sql:56-59`), and `refuse_mutation`.
- **C6, what the re-bodied `auth.uid()` returns.** As `postgres` with the claims set to one uuid
  and `app.act_as` set to another, the function returned the second. As `authenticated`, calling it
  at top level was refused (`permission denied for schema auth`). I did not measure a forged insert
  under C6 (limit, §6).
- **S1/S4b, whether a client can call the new function.** As the fixture owner (`authenticated`),
  both functions returned `2`. That is every row of `app.security_events` across workspaces. A
  direct `select count(*) from app.security_events` by the same identity was refused `42501`.
- **T7, whether the new owner can use it.** As `app_maintenance`, both
  `create or replace function private.refuse_mutation()` and `alter function … security invoker`
  were refused `permission denied for schema private`. The owner change alone cannot be exploited
  at runtime today.
- **PostgreSQL 17 partitions (scratch schema, rolled back).** A BEFORE TRUNCATE statement trigger on
  a partitioned parent is **not cloned** to its partitions. The row trigger is cloned (`tgparentid <> 0`,
  `tgisinternal = f`). `truncate <partition>` was **accepted**, while `truncate <parent>` and
  `delete from <partition>` were refused.
- **Deparse and search_path.** `pg_get_expr(polwithcheck)` for `assets_updated_by_is_caller` returns
  `… ( SELECT uid() AS uid)` under `search_path = auth, public` and under `app, auth`. It returns
  `auth.uid()` only when `auth` is not on the path.
- **Redaction.** I ran each of the four probes through `script()` against three unreachable URLs
  carrying a user and password: an unresolvable host, a refused port, and a missing role. The
  printed line took the form `  ${label}: ${message} (${code})`, as `run.mjs:1497` prints it. **12 of
  12 lines leaked none** of the user, password, host, port or database name.

**Inferred from reading, not measured:**

- That the Supabase migration role cannot `create or replace auth.uid()`, because on the platform
  it is owned by the auth admin and `postgres` is not a superuser. I did not measure this, because
  the shim is not Supabase.
- That a TRUNCATE on a future partition of `audit_logs` or `security_events` would bypass
  `refuse_truncate`. This follows from the scratch measurement above. Neither table is partitioned
  today (`relkind = r`, `relhassubclass = f`, measured).
- Everything about a mid-transaction `set session_replication_role` by a role granted
  `SET` on it (PG 15+ `pg_parameter_acl`).

## 3. Findings

### F1: MEDIUM (pre-existing, not introduced by `055b977`). `updated_by` can be forged by UPDATE today, on seven tables, with no drift at all, so the closure pin closes F3's drift and not F3's harm

**What.** My F3 was about a *gutted INSERT closure*. The new probe does close that drift. M07 and N21,
my own F3 drifts re-run here, and C1 (`to public`) now fail `migrate-clean` by name, where before
they passed both layers. But the harm F3 described is a member writing another member's id into
`updated_by`. That harm is reachable **on the clean set, through UPDATE**, on seven tables.

**Evidence (measured, §2).**
- The grants: `020_business.sql:419` (`business_profiles`), `030_industry.sql:480`
  (`industry_assignments`) and `040_knowledge.sql:506` (`knowledge_items`) each include `updated_by`
  in the UPDATE grant to `authenticated`. `010_identity.sql:403, 407, 419` do the same for
  `workspaces`, `workspace_settings` and `workspace_invitations`, and `020_business.sql:434` does it for
  `page_context_profiles`.
- The policies: the WITH CHECK of each table's UPDATE policies checks the role only. One example is
  `business_profiles_update_owner_or_admin` (`020_business.sql:495-498`).
- The live check: all seven forged updates returned `UPDATE 1`, and the control on `assets` was
  refused.
- The premise: batch 102's header says `updated_by` "is checked on UPDATE everywhere"
  (`102_updated_by_is_caller.sql:6`), and so does `a0-batch-102-updated-by-2026-09-15.md:3`. That
  premise is false for these seven tables.
- The coverage: the 14 INSERT closures the probe pins are exactly the INSERT half.

**Impact.** This is attribution forgery inside one workspace, by a member who may already update the
row: an owner or admin, and on the scoped-editor policies an editor. `updated_by` is the value an
audit reads. **No tenant boundary is crossed.** A1-090 graded the underlying property LOW. I grade
it MEDIUM, as I graded F3, because the repository's own premise that it is closed is written down
and wrong. The Owner may reasonably read it as LOW.

**Why it matters for this change.** The blocker text in `work-packages/WP-0A-DB-00.json` says the
closures' pinning discharges "A1 F3". Only the drift class is discharged. A reader of that text
would believe `updated_by` forgery is closed. It is not.

**Remedies. These are recommendations. The decision belongs to the Owner or the Integration Owner.**

1. A forward migration adding `updated_by = (select auth.uid())` to the WITH CHECK of each of the
   seven tables' UPDATE policies, or one RESTRICTIVE `FOR UPDATE TO authenticated` closure per table
   in 102's shape.
2. Extend `closureRule` to pin those UPDATE closures by text in the same way.
3. Forging-on-UPDATE cases in `rls-smoke` for all seven. Today only the `assets`, `content_*`,
   `approval_*`, `asset_rights` and `research_*` UPDATE forgeries have a case.
4. Correct `102_updated_by_is_caller.sql:6`'s comment in the same forward change. The migration
   itself is integrated and is not rewritten.
5. Reword the blocker's "A1 F3 … discharged" to "F3's INSERT-closure drift discharged; the UPDATE
   path is open (A1 catalog-probes review F1)".

### F2: MEDIUM. The append-only defence still has four neutralisations that keep every layer green

**What.** The trigger probe checks `tgenabled = 'O'` (`run.mjs:223`) and the exact
(table, name, tgtype) set of triggers calling `private.refuse_mutation` (`run.mjs:228-233`). 140's
re-run block checks the count and runs its behavioural proof on **audit_logs only**
(`140_audit.sql:854-963`). Together they close Q0's D20b (disable) and a moved or dropped trigger.
They do not look at:

1. **`tgqual`, the trigger's WHEN clause (T1, T2).** `create or replace trigger … when (false)` keeps
   the name, the tgtype, `tgenabled` and the function the same. On `security_events` that makes
   UPDATE, DELETE and TRUNCATE all **ACCEPTED** by the owner, and every layer stays green. On
   `audit_logs`, a WHEN keyed to 140's own probe row (`old.actor_id = 'migration.140.probe'`), plus a
   statement WHEN that fires only while that row exists, satisfies 140's behavioural proof. Every
   real row can then be deleted or truncated. Measured: both green, and DELETE and TRUNCATE ACCEPTED.
2. **The function body (T3).** `private.refuse_mutation()` is shared by both tables. A body that
   returns OLD/NEW when `tg_table_name = 'security_events'` leaves audit_logs' proof passing and
   makes security_events fully mutable. Measured: green, and ACCEPTED ×3. Nothing pins `prosrc` or
   `proowner`. T7, an owner change to `app_maintenance`, is also green. It is not exploitable at
   runtime today only because that role has no USAGE on `private` (measured).
3. **Inheritance (T6c).** A child `app.a1_audit_child () inherits (app.audit_logs)`, with RLS enabled
   and forced, is green on every layer. Its rows are visible through `app.audit_logs`, and
   `delete from app.audit_logs …` removes them, because the parent's row trigger does not fire for
   child rows.
4. **Partitions (inferred for these tables; the mechanism is measured).** If a later batch rebuilds
   either table as partitioned, as batch 150 must do for `performance_snapshots`, the statement
   TRUNCATE trigger is not cloned, and `truncate <partition>` is accepted. The row triggers would be
   cloned. They are non-internal, so the trigger probe's exact-four array would then fail closed
   until it is updated. That is good, but updating it is exactly the moment someone could accept the
   partitions without statement triggers.

**What is caught.** `session_replication_role = replica` set on the database (T4) is caught by the
pass and by rls-smoke. But the pass catches it by accident: 140's UPDATE probe trips a CHECK
(23514) before the ZZ140 test, exactly as Q0 F6 found for D20b. Set on a role other than the
migration role (T4b), it is caught by nothing. That role holds no UPDATE, DELETE or TRUNCATE grant,
so the privilege layer still refuses (140's ACL block, `140_audit.sql:813-836`). `ENABLE ALWAYS`
(T5), a stronger state, fails the probe. That is fail-closed and acceptable, but it should be
documented.

**Grade.** The trigger is tamper resistance against the owner, as 140's own hint says, and every
neutralisation above needs a committed migration. Nothing here is present today. MEDIUM, because
the probe's printed claim ("the 4 append-only triggers are exactly where they belong",
`run.mjs:241`) and the blocker's "triggers discharged" will be read as stronger than they are.

**Remedies.**

1. In `TRIGGER_PROBE_SQL`, for the refuse set, require `t.tgqual is null`, `t.tgattr = ''::int2vector`
   (no column list) and `t.tgnargs = 0`.
2. Pin `private.refuse_mutation`'s `md5(prosrc)` (or its exact text), `prosecdef`, `proconfig` and
   `proowner`.
3. Refuse any `pg_inherits` row whose parent is `audit_logs` or `security_events`, and require
   `relkind = 'r'` for both. Or, if partitioning is ever wanted, require a statement TRUNCATE trigger
   on every partition.
4. Add security_events to 140's final-state behavioural proof. Q0 F6's remedy is still owed. Make
   the proof's row avoid the CHECK so the refusal is attributed to ZZ140.

### F3: MEDIUM. The SECURITY DEFINER rule answers search_path inside `app`/`private` only; the definer threat has other doors

**What.** The rule is complete for its literal claim: every definer function in `app`/`private`
carries exactly `search_path=""` (`run.mjs:200-201`). D14 and D44 are closed. It is not complete for
the threat:

- **Scope (S1, S2).** A definer function in `public` or in a new schema is invisible to the probe.
  `public` has USAGE for PUBLIC (measured `nspacl`), and EXECUTE defaults to PUBLIC. So
  `public.a1_definer_public()`, with no search_path, was callable by `authenticated` and returned a
  cross-workspace count from a table that identity cannot SELECT. Green on every layer.
- **EXECUTE (S4b).** A definer function in `app` that passes the probe, but keeps the default EXECUTE
  to PUBLIC, did the same. The search_path pin says nothing about who may call the function. No
  layer checks definer EXECUTE grants live. The existing four are each revoked from PUBLIC, and
  `workspace_member_role`/`is_active_member` are granted to `authenticated` on purpose (measured
  `proacl`).
- **Body (S3).** `set_config('search_path', …, true)` inside a pinned function re-opens the path for
  everything after it in the body. Green.
- **Owner (T7).** Not pinned. Two definer functions are owned by `app_authz` by design (RFC-2026-020).
  An owner change is green.
- **`public` CREATE.** No client or service role holds CREATE on `public`, `app` or `auth` (measured).
  An unqualified-name hijack therefore needs a migration today. That is why the scope gap matters
  more than the hijack.

**Grade.** MEDIUM. A committed definer function with default EXECUTE is a cross-tenant read path.
It is reachable, not present: the five definer functions that exist today are clean.

**Remedies.**

1. Probe every schema except `pg_catalog`, `information_schema`, `pg_toast` and a named list of
   platform schemas.
2. Refuse a definer function that is EXECUTE-able by PUBLIC or `anon`. Allow `authenticated` only
   by a named allowlist (today `app.workspace_member_role` and `app.is_active_member`).
3. Pin `proowner` to `{postgres, app_authz}`.
4. Refuse `set_config('search_path'` and `set search_path` in `prosrc`. This is a heuristic, and it
   is cheap.

### F4: LOW. What still defeats a pinned closure, and which layer catches it

Answering the brief's Q1 list, measured:

| Neutralisation | Caught by | Comment |
|---|---|---|
| `or true` in the INSERT closure (M07, N21) | **closure text probe** | F3's drift, closed |
| `alter policy … to public` (C1) | **closure text probe** | |
| an extra PERMISSIVE policy | (not needed) | cannot weaken a restrictive closure; the 100/030 replacements pin the policy sets anyway |
| a second RESTRICTIVE policy (C2) | pass (exact restrictive set) | cannot widen: restrictive policies AND |
| `force row level security` off (C9) | pass | irrelevant to the closure: the actor is `authenticated`, not the owner |
| `disable row level security` (C5) | pass + rls-smoke | |
| `authenticated BYPASSRLS` (C4) | **rls-smoke only** (273 cases) | `migrate-clean` does not re-assert client role attributes after 000-003. Recommend a role-attribute probe beside these four |
| UPDATE-side check gutted on `assets` (C3, C3b) | rls-smoke only | on the seven F1 tables there is nothing to gut |
| `auth.uid()` re-bodied (C6) | **none** | the text pin is by NAME `auth.uid()`; the function's body is the real identity source. In the shim `postgres` can replace it. On Supabase I infer it cannot. Remedy: pin `auth.uid`'s `md5(prosrc)` and owner in `db-authz-proofs` or in a probe |

Two fail-closed properties to record:

- The deparse depends on the session `search_path`. If `auth` is on it, the probe fails every
  closure, even though no policy changed (measured).
- The FK and closure lists are interpolated into SQL unescaped (`run.mjs:132`, `:166-179`). A quote
  in a key breaks the probe rather than injecting, because only committed code can change it.

### F5: LOW. Redaction of connection strings holds; the definer probe prints `proconfig` values verbatim

The probes print only object names, plus `confdeltype`/`confupdtype` letters, `tgenabled` letters
and `proconfig`. `run.mjs:1497` prints `error.message`, which has been through `redactConnection`
(`psql-driver.mjs:170`). I measured 12 of 12 connection-failure lines clean (§2). But S5 shows the
definer probe echoing a function-level `SET` value into the build log:
`proconfig=search_path="",app.a1_fake_setting=A1-FAKE-VALUE-NOT-A-SECRET` (`run.mjs:198`). A value
there would already be committed in a migration, so this adds a copy in CI logs and creates no new
exposure. **Remedy:** print only the setting names (`split_part(x, '=', 1)`). Separately, and not
introduced here: `redactConnection` skips URL components of two characters or fewer
(`psql-driver.mjs:42`), so a host named `db` or a two-character password would print. That is a
note only.

### F6: LOW. The exemption list is a self-service register with no named reviewer

`FK_ACTION_EXEMPTIONS` (`run.mjs:128`) admits an `ON DELETE CASCADE` if a key is added to the list
with a reason longer than 40 characters (`foundation-contract.test.mjs:2247`). A
cascade on tenant data is the "irreversible deletion" stop-the-line class in
`CONTRIBUTING_AGENTS.md:44`. This repeats my earlier F1, the register pattern, at a smaller scale.
Removing a table from `UPDATED_BY_CLOSURES` together with its policy would pass this probe. I infer
that the 102 replacement's count by name would still catch it; I did not measure that. **Remedy:**
the README section (`db/foundation/README.md:320-338`) should say, in one sentence, that adding an
FK action exemption, or removing a pinned closure, trigger or definer rule, needs the
Security/Privacy reviewer's recorded sign-off in the handoff.

### F7: NOTE. The handoff does not describe this commit

`handoffs/WP-0A-DB-00-author-handoff.json:8` gives `head_revision_or_patch_checksum` as `9039738`,
which is the base, and `:10-11` lists no files added or modified, although 11 changed.
`CONTRIBUTING_AGENTS.md:53` requires the handoff to list changed files. The Integration Owner should
not accept the handoff in this state. It may be that the protocol fills it in at merge; that is for
C0 or the Integration Owner to judge.

## 4. The brief's questions, answered

1. **Does it close F3?** It closes F3's *drift* (a gutted, re-roled or permissive INSERT closure) on
   all 14 plus 2 closures. M07, N21 and C1 measured. It does not close F3's *harm*: `updated_by`
   forgery by UPDATE works today on seven tables (F1). Of the listed neutralisations: an extra
   permissive or a second restrictive policy cannot widen; `to public` is caught by the probe;
   FORCE off is irrelevant to `authenticated`; disabling RLS is caught by the pass and rls-smoke;
   BYPASSRLS is caught by rls-smoke only; a re-bodied `auth.uid()` is caught by none (F4).
2. **SECURITY DEFINER.** It is complete for search_path inside `app`/`private`. It is incomplete
   for the threat: other schemas, EXECUTE-to-PUBLIC, a path reset inside the body, and the owner
   (F3).
3. **Audit append-only.** It is **not** fully defended. WHEN clauses, a re-bodied shared function,
   an inheriting child, and future partitions each defeat it with every layer green (F2).
   `session_replication_role` on the database is caught, by accident. On another role the grant
   layer holds.
4. **Leaks.** Connection-string redaction holds (12/12). The definer probe echoes `proconfig`
   values (F5, LOW).
5. **Delegation.** It is stated honestly, three times: plan §7, disposition §3, and the commit
   message and handoff limitation. Each says the Owner's words were given before the seven
   questions existed. On security grounds, two of the seven should not have been taken on an
   advance delegation:
   - **Question F** (narrow the blockers). This is a statement that security findings (A1 F3, Q0
     F4 and F6) are discharged. That is a finding about security coverage, and F1 and F2 show it
     overstated. It should follow the security review, not precede it.
   - **Question C's exemption mechanism.** It creates a path by which a later change admits an FK
     cascade, which is a data-deletion decision (F6).

   Questions A, B, D, E and G are engineering choices, and a delegation in advance is proportionate
   for them.
6. **Stop-the-line.** See §5.

## 5. Stop-the-line verdict

**No stop-the-line finding against `055b977`.**

- The change adds four read-only probes. It changes no migration, policy, grant or role (measured).
  It makes `migrate-clean` strictly stricter, and every failure I produced fails closed.
- **Tenant leakage:** none introduced. F3's cross-tenant definer path is reachable, not present:
  it needs a committed function.
- **Secret exposure:** none. Redaction was measured. F5 only copies a value already committed.
- **Migration divergence:** none. No migration was touched.

F1 is a present, pre-existing attribution forgery inside one workspace. It is not tenant leakage and
is not stop-the-line under `CONTRIBUTING_AGENTS.md:44`. But the blocker text should not say F3 is
discharged until the UPDATE path is closed. I recommend that the Owner take F1 remedies 1-3 and
F2 remedies 1-3 as the next increment, ahead of the eleven INSERT forging cases, because F1 is
exploitable on the clean set and those cases are not.

## 6. Limits of this run

- I am a same-vendor subagent under the Author's brief (§0). I chose the drifts myself. I tried one
  or two tables per family, not every table.
- The live database is the CI shim on stock PostgreSQL 17.11, not Supabase. C6 (who may replace
  `auth.uid()`) and the platform `search_path` were not measured on the platform.
- I did not measure a forged INSERT end to end under C6. I measured only that the re-bodied
  function returns the GUC's uuid.
- F1's forgery was measured as the fixture's workspace owner. The scoped-editor variant is inferred
  from the policy text.
- I did not run `npm run verify` or the full suite, only `foundation-contract.test.mjs` (68/68).
  Floors, digests and the integrity manifest are the Tester's to verify.
- I did not reproduce A0's ten drifts one by one. I reproduced the two of my own that A0 cites
  (M07, N21) and added C1.
- Every drift was appended to `140_audit.sql` and restored byte for byte (sha256 `2ac596bb…c1ad37149`
  before and after). `git status` was clean apart from this file before commit. My scripts and logs
  remain only in my private scratchpad subdirectory `a1-probes/`.
