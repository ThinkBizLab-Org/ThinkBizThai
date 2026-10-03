# A1 security/privacy review: batch 129, what initdb made, read as initdb made it

- **Package:** `WP-0A-DB-00`. **Role:** independent Security/Privacy reviewer, run `/claude/a1_bastion`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-129`, head `0f08d92` over code `36796dd`, base
  `75c9274` (main). Author `/claude/a0_atlas`. PR #168 (Draft).
- **Checked out as:** local branch `review/a1-batch-129` at `0f08d92`, in this run's own worktree.
- **Status:** this file records findings. It advances no status, approves nothing, and fixes nothing.

## 0. What I am

I am a subagent started by a workflow of `/claude/a0_atlas`, the Author of this batch. I am the same
vendor and model family as the Author. Under RFC-2026-024 that is the stated independence limit of this
role run. Whether this review is accepted as the A1 role's signature is for the Integration Owner and
the Product Owner to decide, not for me.

## 1. What I read and what I measured

**Read:** `CONTRIBUTING_AGENTS.md`, the plan `a0-batch-129-plan-2026-10-03.md`, the disposition
`product-owner-disposition-2026-10-03-batch-129.md`, `git diff 75c9274..0f08d92` (in full for
`scripts/db/run.mjs`, `scripts/db/psql-driver.mjs` and `scripts/test-suite-contract.mjs`; the manifest
rationale and blocker 186's text in `work-packages/WP-0A-DB-00.json`), and the new static pins in
`test-kits/db/foundation-contract.test.mjs` around line 2818.

**Measured.** Node `v24.20.0`, checked before each run. PostgreSQL 17.11, `/opt/homebrew/bin`. A fresh
`initdb --locale=C -A trust -U postgres`, `LC_ALL=C`, 127.0.0.1:5501, TCP only. The shim ran first.

| Command | Exit | Output |
|---|---|---|
| `make db-migrate-clean` | **0** | "system object fingerprint: 3753 objects initdb made, taken before the migrations and sealed"; the fingerprint probe refused its drift and was clean again after every drift |
| `make db-rls-smoke` (twice, same database) | **0**, **0** | authz proofs 6 of 6, both times |
| `npm run check` (on `review/a1-batch-129`) | **0** | tests 677, pass 677, fail 0 |
| `node scripts/verify-branch-scope.mjs 75c9274 WP-0A-DB-00` | **0** | "all 11 changed path(s) are declared, and every amendment explains one" |

**Read-only catalog readings** on the database as built, with no drift:

| Reading | Value |
|---|---|
| initdb functions (OID < 16384) | 3330 |
| ... of which have an SQL-standard body (`prosqlbody` not null) | **56** (10 in `information_schema`, 46 in `pg_catalog`) |
| ... of those 56, `prosrc` is the empty string | **56 of 56** (one distinct value) |
| functions made by migrations with `prosqlbody` | 0 |
| `pg_db_role_setting` rows (all, and for the client roles) | 0, 0 |
| `pg_event_trigger` rows | 0 |
| `pg_default_acl` rows | 0 |
| `pg_seclabel` rows | 0 |
| initdb types with a non-null `typacl` | 0 |
| `catalog_baseline` schema ACL / owner | `{postgres=UC/postgres}` / postgres |
| `catalog_baseline.system_fingerprint` ACL / rows | `{postgres=arwdDxtm/postgres}` / 3753 |
| `anon`, `authenticated` connection limit / valid until | -1 / null, both |

`140_audit.sql` was copied before the round (sha1 `2ac2fc2c592be3b5fa7844ce12793093b782a502`). No drift
was appended to it, and it was `cmp`-identical at the end. The cluster was stopped, its data directory
removed, and port 5501 is free.

**Not measured by me:** the plan's 18 drift rounds and 7 mutation rounds (§3, §4). I read their record
and did not re-run them. I also did not write or run new bypass drifts against the fingerprint. The
findings below come from reading the code plus the catalog readings above. None is a demonstrated
end-to-end exploit.

## 2. Findings

### R1 (MEDIUM, read and catalog-measured): the fingerprint does not read SQL-standard function bodies

`scripts/db/run.mjs:695-698` (`SYSTEM_FINGERPRINT_ROWS`) reads `p.prosrc` as the function body. It does
not read `p.prosqlbody`. For a function written with an SQL-standard body (`BEGIN ATOMIC` or a
`RETURN` expression), PostgreSQL stores the body in `prosqlbody` and leaves `prosrc` empty.

On the clean build, **56 initdb functions** have such a body, and all 56 have `prosrc = ''`. Among
them are `information_schema._pg_char_max_length` and `information_schema._pg_interval_type`, the two
functions named in C0 X8 and Q0 Q-IPF, which this batch records as closed.

**What follows from the code, not demonstrated:**

- For these 56 functions, a replacement that keeps an SQL-standard body and changes no other read
  column leaves the fingerprint row unchanged.
- X8 and Q-IPF are named today because their drifts also changed a read column: `prosecdef`, and a
  body that is not SQL-standard and so changes `prosrc`.
- The tenant-read shape of X8 and Q-IPF needs SECURITY DEFINER. `prosecdef` is read, so that shape
  stays closed. What stays open is a change of logic under invoker rights in one of these 56 functions.
- I found no probe in `run.mjs` and no migration that calls one of them (only `round` appears in
  `run.mjs`, as JavaScript `Math.round`).

The README (`db/foundation/README.md:528` and following), the probe's claim ("body, security, ...") and
plan §5 ("body (`prosrc`)") therefore overstate what is read for these 56 functions.

**Remedy:** add `p.prosqlbody::text` (or `pg_get_function_sqlbody(p.oid)`) to the function row. Add a
self-test drift that replaces one SQL-standard-body initdb function with another SQL-standard body and
nothing else changed. Extend the static pin at `test-kits/db/foundation-contract.test.mjs:2818`. Until
then, record it on blocker 186 as owed.

### R2 (LOW, read and catalog-measured): role- and database-level setting defaults are read for one setting only

`pg_db_role_setting` is read only for `session_replication_role` (`run.mjs:1029-1038`). The new
attribute rule (`CLIENT_ROLE_FALSE_ATTRIBUTES`, `run.mjs:629`) reads `pg_roles` attributes and not role
defaults.

No probe pins the setting defaults of `anon`, `authenticated`, or every role, on this database or all
databases. That includes settings the policies read through `current_setting`, and `search_path`.
Measured clean value: 0 rows.

I did not build a drift for this. The reach depends on how sessions are established on the platform,
which is outside the CI shim.

**Remedy:** pin the `pg_db_role_setting` rows that apply to a client role, to `PUBLIC` (`setrole = 0`),
or to the database, as an empty list or an allowlist. Add a drift. Otherwise record it as owed.

### R3 (LOW, read and catalog-measured): event triggers are read by no probe

Neither `run.mjs` nor any test kit mentions `pg_event_trigger` (grep: 0). The guard and the fingerprint
read by OID ranges and kinds that do not include event triggers. An event trigger fires on DDL in any
session, and a client session holds TEMPORARY on the database. So a function a migration attaches to
one runs in contexts no probe enumerates. A SECURITY DEFINER function there would still meet the
security-definer rules, by reading. Measured clean value: 0 rows.

**Remedy:** pin `pg_event_trigger` empty (or an allowlist) in the guard or the trigger probe, with a
drift. Otherwise record it as owed.

### R4 (INFO): the other items the question named

All were read only, and I did not try any of them.

- **Comments (`pg_description`):** not read. They grant nothing. No remedy is needed.
- **Security labels:** not read. No label provider is loaded (`pg_seclabel` is empty). A provider
  would need `shared_preload_libraries`, which is outside migration reach.
- **pg_proc attributes not captured:** `prosqlbody` (R1); `proretset`, `proargtypes` and
  `proallargtypes`/`proargmodes`, which cannot change in place without a new OID or a change to the
  identity text that is read; and `proargnames`, part of the identity arguments in `ident`, not of `fp`.
  The comparison joins on (kind, OID), so a rename of an argument alone changes `ident` and not `fp`.
  It is not flagged, and it grants nothing.
- **Operators, casts, aggregates, types, operator classes:** plan §5 states these as not read. The
  guard (`run.mjs:1300-1309`) reads new operators in system schemas and every new cast by OID. What an
  `ALTER OPERATOR ... SET (RESTRICT/JOIN)` or a type's owner or ACL change does stays unread. The type
  ACLs measure null.
- **`pg_class.reloptions`, `relrowsecurity`, owner (`ALTER ... OWNER`):** read for relations,
  functions, schemas and languages. Not read for types or operators (as above).
- **`pg_rewrite` on a system view:** read through `pg_get_viewdef` and the rule names.
- **Client role attributes:** `rolconnlimit` and `rolvaliduntil` are not read. I agree with the stated
  reason that they grant nothing.
- **`pg_default_acl`:** rule 4 (`run.mjs:524-535`) reads every entry, in every schema and none, for
  every grantor. The grantees read are PUBLIC, `anon` and `authenticated`. With client memberships
  pinned empty, that is complete for a client.
- **The baseline table and its seal:** a migration that edits `catalog_baseline.system_fingerprint`
  moves the seal, and the executor compares the seal in JavaScript (`run.mjs:2972-2985`). Defeating it
  needs the seal query's own catalog functions forged as well. That is the "perfect forgery by a
  superuser migration" class that blocker 186 and plan §5 already record as owed, and nothing new opens
  here. The baseline schema and table grant nothing to a client (measured).

## 3. Anything newly opened by this batch

No. The diff adds reads: a probe, rules, drifts and pins. It also adds one schema and table that hold
no client grant (measured). R1 to R3 are gaps in coverage that pre-date this batch. R1 matters because
this batch's closure claim for C0 G1 / Q0 F1 says "body", and for 56 functions it is not read.

## 4. Stop-the-line verdict

**No stop-the-line.**

- No secret, tenant leak, migration divergence or contract mismatch was found.
- R1 is MEDIUM. Under the Owner's disposition of 2026-10-03 (`เอาตามที่แนะนำเลย ลุยต่อ`, ending the
  hardening chain at 129), R1 goes to blocker 186 as owed unless the Owner chooses otherwise.
- R2 and R3 are LOW and go to blocker 186 as owed.

From A1's side, nothing in this review blocks the merge. What RFC-2026-002 requires still stands: C0's
and Q0's evidence, a green CI run on the head, and the Integration Owner's or Owner's act.

## 5. Limits

- I did not re-run the plan's drift and mutation rounds, and I wrote no new bypass drifts. R1 to R3 are
  findings from reading the code plus clean-catalog measurement, not exploits shown end to end.
- I measured `npm run check` on `review/a1-batch-129`, not on the branch name
  `agent/claude/WP-0A-DB-00-batch-129`. That branch is checked out in another worktree, so the handoff
  guard's branch-name reading was not measured by me.
- PostgreSQL 17.11 only. The platform (Supabase) is not the CI shim.
- Same vendor and model family as the Author (§0).
