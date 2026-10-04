# A1 security review: the owed-tooling batch

- **Package:** `WP-0A-DB-00`. **Role:** independent Security/Privacy reviewer, run `/claude/a1_bastion`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-owed-tooling` (PR #176, Draft, open, not merged), head
  `af394fa` (`af394fa1f16252fc55af32488f22fd3327ba38fd`) over code `70ab5ca`
  (`70ab5ca4c596d7cbf88041a0630aebe7b67b2d60`), base `5558b26` (main, PR #175's merge). Author `/claude/a0_atlas`.
- **Checked out as:** local branch `review/a1-batch-owed-tooling` at `af394fa`, in this run's own worktree. The
  branch name itself is checked out in another worktree, so for `verify`, `check:handoff` and branch scope I
  made a local clone in my private directory (`a1-owed-tooling/repo`), created
  `agent/claude/WP-0A-DB-00-batch-owed-tooling` there at `af394fa` (`git rev-parse --abbrev-ref HEAD` printed that
  name; `main`, `origin/main` and `origin/HEAD` there are `5558b26`) and measured on that name, not detached. The
  live rounds ran in that clone too. I committed nothing in the clone.
- **Status:** this file records findings. It advances no status, approves nothing and fixes nothing.

## 0. What I am

I am a subagent started by a workflow of `/claude/a0_atlas`, the Author of this batch. I am the same vendor and
model family as the Author. Under RFC-2026-024 that is the stated independence limit of this role run.
Accepting this review as the A1 role's signature is the Integration Owner's and the Product Owner's act, not
mine. This file is input to that acceptance.

## 1. Read and measured

**Read:** `CONTRIBUTING_AGENTS.md`; the plan `a0-batch-owed-tooling-plan-2026-10-03.md` in full; the disposition
`product-owner-disposition-2026-10-03-batch-owed-tooling.md` in full; the three commit messages
`5558b26..af394fa`; `git diff 5558b26..af394fa` for `scripts/db/run.mjs`, `scripts/db/psql-driver.mjs`,
`scripts/db/generate-pinned-grants.mjs` in full, and the new test code of items 1, 5 and 6 in
`test-kits/db/foundation-contract.test.mjs` (:3415-3466, :4266-4318, :4762-4895); the appended text of
`open_blockers[185]` and `[191]`-`[195]` (by script: every one of the six is an append to its base text, none
rewritten, 196 entries before and after); the handoff's acceptance, tests and known limitations (by script);
`TRIGGER_PROBE_SQL` (`run.mjs:1059-1150`) and `REWRITE_RULE_PROBE_SQL` (`run.mjs:1903-1920`), which hold the
neighbours of the new trigger rule; `testHostRefusal` (`psql-driver.mjs:37-61`). PR #175 and the CI run were read
with `gh` (merge commit `5558b26`, head `ab7db39`, merged 2026-10-04T06:05:20Z; run 37181470982 "Bootstrap
validation" success on `ab7db39`); PR #176 is Draft, open, head `af394fa`, its `bootstrap` check passing.

**Measured.** Node `v24.20.0` (`/Users/bank/.local/node-v24.20.0/bin`; `node -v` checked inside every round
script and before every npm run; the PATH Node 26 was never used). PostgreSQL 17.11 from `/opt/homebrew/bin`, port
**5501** on `127.0.0.1` only, `-c unix_socket_directories=''`, `initdb --locale=C -A trust -U postgres`,
`LC_ALL=C`, the shim `db/foundation/ci/supabase-shim.sql` first, re-initdb every round. Every drift was APPENDED
to `db/foundation/migrations/140_audit.sql` in the clone and restored byte for byte after its round (sha256
`2ac596bb950e8dfb...` before and after, compared by the round script every time). Private directory
`a1-owed-tooling/` in the run's scratchpad. The cluster was stopped and every data directory removed at the end;
`lsof -iTCP:5501 -sTCP:LISTEN` exit 1 (nothing listening). No other port was touched.

| # | Command | Where | Exit | Result |
|---|---|---|---|---|
| V1 | `node scripts/verify-branch-scope.mjs 5558b26 WP-0A-DB-00` | branch name, `af394fa` | 0 | "all 17 changed path(s) are declared, and every amendment explains one" |
| V2 | `npm run check:handoff` | branch name | 0 | "describes the branch: nothing substantive after its cited head" (cites `3dd930e`; `af394fa` touches only the handoff) |
| V3 | `npm run verify` | branch name | 0 | "clean: exit 0 — tests 684, pass 684, fail 0, skipped 0, todo 0"; clone tree clean after |
| L0 | fresh cluster, `make db-migrate-clean`, `make db-rls-smoke` | `af394fa` | 0, 0 | 30 probes each "refused ... clean again"; pinned trigger probe "51 pinned definitions on 47 tables ... the 4 functions" (2 drifts refused); post-migrate pass "51 apply-time blocks, 39 re-run as written, 12 superseded"; rls-smoke "1087 isolation case(s) passed" |
| L1 | fresh cluster, migrate-clean, then `generate-pinned-grants.mjs --check` | `af394fa` | 0, 0 | "pinned-grants.json: matches the catalog", "read-allowlist-known-exceptions.json: matches the catalog", 66 tables |
| L2-L9 | drifts appended to 140 (§2) | `af394fa` | see §2 | |
| L10 | the real tools with crafted URLs (§3.4) | live cluster | 2 each | what psql printed, after redaction |
| S1 | `psqlLex` on 12 shapes; `redactConnection` on 10 URLs (`lex.mjs`) | `af394fa` code | -- | §3.3, §3.4 |
| S2 | the do-block allowlist, copied byte for byte from :3426-3450, on 5 drifts (`doblock.mjs`) | `af394fa` code | -- | §3.1 |
| S3 | `AUDIT_TABLE_TOUCH` and its two older siblings, copied byte for byte from :3946-3948 and :4311-4318, on 24 spellings (`trip.mjs`) | `af394fa` code | -- | §3.2 |

## 2. Live drifts (each on a fresh cluster, appended to 140, restored)

| Drift | What it tries | migrate-clean | rls-smoke | Verdict |
|---|---|---|---|---|
| L2 `internal` | `create trigger a1_hidden before update on app.workspaces ... when (new.name = 'a1-never') execute function private.refuse_mutation();` then `update pg_catalog.pg_trigger set tgisinternal = true where tgname = 'a1_hidden';` | **0** | **0** (1087 of 1087) | **passes every layer**: A1-OT-1 |
| L3 `fires` | L2 again, then, after migrate-clean, an insert and an update of a workspace to `a1-never` | 0 | -- | the hidden trigger is enabled and FIRES: "app.workspaces is append-only and refuses UPDATE"; `tgisinternal` true; the pinned probe's own WHERE reads 0 rows of it |
| L4 `child` | `create table public.a1_ws_child () inherits (app.workspaces);` and a BEFORE UPDATE trigger on it | **0** | **0** (1087) | passes every layer; stated limit (app and private only): A1-OT-I2 |
| L5 `disabled` | `alter table app.workspaces disable trigger set_updated_at;` | **2** | 0 | held: the trigger probe's first rule, "trigger(s) not enabled: app.workspaces.set_updated_at (tgenabled D)" |
| L6 `public` | `grant usage on schema private to public; grant create on schema app to public;` | **2** | **2** | held: rule 7 names every role, "unlisted: anon CREATE on app, unlisted: anon USAGE on private, ..." |
| L7 `copydyn` | a one-line `do $$ begin execute 'copy (select 1) to pro' \|\| 'gram ''touch <private>/copy-ran.marker'''; end $$;` | 2 | 0 | the marker file WAS created at apply; the 2 is only the post-migrate pass's do-block FORM rule |
| L8 `copydyn2` | L7 written as a multi-line `do $$` ... `end $$;` | **0** | **0** (1087) | the marker file was created; **passes every layer**: the stated limit, measured: A1-OT-I1 |

L5 and L6 are the attempts that failed: disabling a pinned trigger, and schema privileges through PUBLIC, are both
refused by name.

## 3. Trying to defeat each new rule

### 3.1 Item 1: 170's do-block allowlist (`foundation-contract.test.mjs:3426-3450`)

The plan asks whether it is an allowlist "in substance or only in form". **For its calls and its sources, in
form.** The body is read with string literals blanked but with double-quoted identifiers and `/* */` comments
left in, and the call scan (:3438) needs a bare name directly followed by optional whitespace and `(`, the FROM
scan (:3442) a bare name after `from` and whitespace, the relation scan (:3446) a bare `x.y`. Measured with the
function copied byte for byte, each of these appended inside 170's own block returns **no problem**:

```
select string_agg(a.attname, ', ') into offending from pg_catalog.pg_attribute a where set_config/**/('role', 'app_worker', false) is not null;
select string_agg(a.attname, ', ') into offending from pg_catalog.pg_attribute a where "set_config"('role', 'app_worker', false) is not null;
select string_agg(a.attname, ', ') into offending from pg_catalog.pg_attribute a where exists (select 1 from "app"."jobs");
select string_agg(a.attname, ', ') into offending from pg_catalog.pg_attribute a where exists (select 1 from/**/app/**/./**/jobs);
```

while the plain `pg_catalog.set_config(...)` form is refused, as M1 measured. All four are valid PostgreSQL
(a comment is whitespace; `"set_config"` resolves through pg_catalog). This is the exact finding item 1 closes
(C0-170R-1, A1 R-1, Q0R-F1: a side-effecting call in `select ... into`), reachable by a different spelling.
**A1-OT-2.**

### 3.2 Item 6: the widened audit-table tripwire (`foundation-contract.test.mjs:4279-4318`)

The scan strips `--` comments only. Measured (S3), these pass all seven patterns (the new five, the older
`AUDIT_TABLE_POLICY` and `AUDIT_TABLE_ALTER`):

- `grant insert on /* x */ app.audit_logs to authenticated` and `grant insert on table/**/app.audit_logs ...`;
- `create trigger t before insert on/**/app.audit_logs ...`; `alter table /* x */ app.audit_logs disable trigger refuse_mutation` (the older ALTER pattern has the same gap);
- `create rule r as on insert to app.audit_logs do instead nothing` -- no pattern reads CREATE RULE, which silently
  drops every audit write;
- `create table app.audit_logs_new (like app.audit_logs); alter table app.audit_logs_new rename to audit_logs`
  (only the rename's target names the table);
- `create or replace function private.refuse_mutation() ... return new ...` (the trigger function, not the table).

Every one of these is caught LIVE today (pinned grant probe; trigger probe's tgenabled rule; `REWRITE_RULE_PROBE`;
pinned grant probe's closed table list; and, new in this batch, the refuse_mutation body digest in the pinned
trigger probe), so nothing is open. But the test's comment (:4282), the handoff's known limitation and
open_blockers[191]'s append ("each spelling pinned") name a dynamic EXECUTE as what the scan cannot read; static
spellings it cannot read exist too. **A1-OT-3.**

### 3.3 Item 9: COPY ... TO/FROM PROGRAM (`psql-driver.mjs:422`, :509-520)

Refused (S1): `to program`; upper case with a tab; **nested comments** `to /* a /* b */ c */ program` (the lazy
comment alternative stretches to the last `*/`); inside a dollar body and an EXECUTE literal; `\copy ... to
program` (twice: this rule and the meta-command rule). Also refused by the older meta-command rule: `\g |cmd`,
`\o |cmd`, `\gexec`. Not refused: a COPY whose keyword is computed (`'to pro' || 'gram ...'`, `format(... %s,
'program')`) -- the stated limit, which L8 measures end to end: the command ran on the server's OS account and
every layer was green. Also not refused, and outside the rule's claim: `alter system set archive_command = ...`
(no execution path on a default cluster: archive_mode is off and needs a restart). The rule over-refuses English
in comments: `-- hand this to program owners` is refused (fails closed; inconvenience only). **A1-OT-I1.**

### 3.4 Item 7: `redactConnection` (`psql-driver.mjs:80-108`)

The batch's half holds: `.../postgres#?host=q0-probe.invalid` and `?host=%71%30-probe.invalid` are redacted
(S1), and a bracketed IPv6 host `[::1]` is redacted without its brackets. The half it did not touch -- the
authority and path, read through the WHATWG parser -- leaks, measured through **both real tools** (L10; each run
exits 2, so only the printed text is at issue):

| `DB_TEST_URL` | `db-migrate-clean` and `db-rls-smoke` printed |
|---|---|
| `postgresql://a1sec%72etuser@127.0.0.1:5501/postgres` | `role "a1secretuser" does not exist` |
| `postgresql://postgres@127.0.0.1:5501/a1sec%72etdb` | `database "a1secretdb" does not exist` |
| `postgresql://postgres@%61%31-encoded.invalid:5501/postgres` | `could not translate host name "a1-encoded.invalid"` |
| `postgresql://postgres@a1-hostone.invalid:5501,a1-hosttwo.invalid:5502/postgres` | both host names, unredacted |
| `postgresql://postgres@127.0.0.1:5501/postgres?host=a1-tail#x.invalid` | `"[redacted]#x.invalid"` (the tail) |

Causes: a non-special scheme keeps percent-encoding in `username`, `hostname` and `pathname`, while libpq decodes
them; a multi-host list or a zone-id IPv6 host (`[fe80::1%25lo0]`) makes `new URL` throw, after which no
authority part is redacted at all; and the new raw-query loop splits on `#` (:98), which neither libpq nor
`testHostRefusal` does, although its comment (:93) says it reads the query "the way libpq and testHostRefusal
read it". Not newly opened (the authority reading predates this batch, and these targets are not the ones the
host guard covers); §12.5's redaction requirement is the one it falls short of. **A1-OT-4.**

### 3.5 Item 2: the pinned trigger set (`run.mjs:1159-1252`)

- **Internal vs non-internal.** Both of the probe's rules read `not t.tgisinternal` (:1212, :1237), as do the
  refuse_mutation rule (:1094) and the pinned shape probe. The migration owner is a superuser and may UPDATE
  pg_catalog rows without `allow_system_table_mods`; L2/L3 measured an unpinned trigger on `app.workspaces` --
  the very table A1 R-2 named -- hidden that way, firing, and green on every layer. Pre-existing for every
  trigger rule; it reopens the new rule's own finding for a catalog-writing file. **A1-OT-1.**
- **Disabled.** Held by the trigger probe's first rule (L5), which reads every trigger's `tgenabled`, internal ones
  included.
- **Partition/child.** A new child or partition IN app or private is a new relation and is refused by the pinned
  grant probe's closed list; inheritance from the audit tables is refused by the trigger probe (:1120-1126). A
  child in `public` with its own trigger passes (L4), as the stated limit says. **A1-OT-I2.**
- Rewrite rules and event triggers, the trigger's siblings, are each read by their own probe (`run.mjs:1141`,
  :1903).

### 3.6 Item 10: schema owner and role attributes (`run.mjs:1408-1441`)

Held where tried: PUBLIC's USAGE and CREATE are read through every role (L6). The owner rule compares
`nspowner` to `session_user`'s oid; the drift set already covers handing private to a command role. Rules 7 and 8
skip `^pg_` roles: a grant on app or private TO a predefined role is not read by rule 7, but reaches no
non-superuser while the membership rule pins every non-superuser role's memberships to none (the implicit
`pg_database_owner` member is the database owner, a superuser). No opening; noted only. Role-level GUC defaults
(`pg_db_role_setting`) are not attributes and the claim does not say otherwise; session_replication_role's is
read by the trigger probe.

### 3.7 Item 5: the derived export set

The token half reads names `(token|secret|credential|password)s?` (`foundation-contract.test.mjs:4766-4767`); a
grep of every `.sql` for `*key*`, `*hash*`, `*signature*`, `*auth*`, `*jwt*`, `*salt*`, `*cert*` text/bytea columns
finds only dedupe/idempotency keys and digests, none of them material. The set is pinned both ways by name, so it
is an allowlist in substance for today's schema; a future `api_key` or `private_key` column outside a SECRET-4
cell would not join it, which the known limitation already states.

## 4. Findings

| ID | Grade | Where | Finding | Remedy |
|---|---|---|---|---|
| A1-OT-1 | LOW | `scripts/db/run.mjs:1212`, `:1237` (also `:1094`, `:1686`) | Every trigger pin reads non-internal triggers only, and a fed source may mark any trigger internal with `update pg_catalog.pg_trigger set tgisinternal = true`. Measured: an unpinned BEFORE UPDATE trigger on app.workspaces, hidden so, fires and passes migrate-clean 0 and rls-smoke 0 (1087). Pre-existing, but it is A1 R-2's class reopened by a catalog write. | Refuse any internal trigger in app or private whose function is not one of pg_catalog's `RI_FKey_*` (or whose `tgconstraint` is not an FK constraint of that table), in the trigger probe; and/or refuse INSERT/UPDATE/DELETE on a `pg_catalog` relation in psqlLex for every fed source, beside `allow_system_table_mods`. |
| A1-OT-2 | LOW | `test-kits/db/foundation-contract.test.mjs:3438`, `:3442`, `:3446` | Item 1's allowlist is one in form: a `/* */` comment or a double-quoted identifier between a name and `(` (or after FROM) passes the call, FROM and relation scans; four spellings, `set_config` in `select ... into` among them, return no problem. | In the blanked body refuse any `"` and any `/*` (170's block has neither; its quotes are in comments and literals), or strip nested block comments before scanning; add the four spellings as in-test drifts. |
| A1-OT-3 | LOW | `test-kits/db/foundation-contract.test.mjs:4282`, `:4311-4318`; handoff known limitation 3; open_blockers[191]'s append | The audit-table tripwire is described as missing only a dynamic EXECUTE; static spellings also pass: a block comment between `on` and the table name (also in the older ALTER and POLICY patterns), CREATE RULE on either table, and a create-then-rename swap. Each is caught live today, so nothing is open; the statement of the limit is overstated. | Strip block comments (nested) before the scan; add a CREATE RULE pattern and a `rename to audit_logs|security_events` pattern; restate the limit as "a text scan of these spellings; the live probes hold the rest". |
| A1-OT-4 | LOW | `scripts/db/psql-driver.mjs:86`, `:93`, `:98` | Redaction reads the authority and path through the WHATWG parser: percent-encoded user, database and host names, and multi-host or zone-id URLs (where `new URL` throws), are printed unredacted by db-migrate-clean and db-rls-smoke (measured); the raw-query loop's split on `#` leaves a host value's tail, and its comment says it reads the query as libpq does. Not newly opened; the batch's G-2 half holds. | Redact each authority part both as written and percent-decoded; parse the authority raw (split hosts on `,`, strip `:port` and brackets) instead of relying on `new URL`; split the query on `&` only, as libpq and `testHostRefusal` do, and correct the comment. Pin the five URLs above as cases. |
| A1-OT-I1 | INFO | `scripts/db/psql-driver.mjs:422`, `:509-520` | The stated limit is real and complete as stated: a computed `'pro' \|\| 'gram'` in a multi-line do-block ran a shell command on the server and every layer was green (L8). The rule also refuses English in comments ("to program owners"). | None owed beyond the statement; if the limit is to shrink, refuse EXECUTE of a non-literal in fed sources, or apply migrations as a non-superuser without `pg_execute_server_program`. |
| A1-OT-I2 | INFO | `scripts/db/run.mjs:1120-1126` | A child of `app.workspaces` in `public` carrying its own trigger passes every layer (L4); inheritance is refused for the two audit tables only. Covered by the stated limit "app and private only". | Optionally extend the pg_inherits refusal from the audit tables to every table in app and private. |
| A1-OT-I3 | INFO | `evidence/WP-0A-DB-00/product-owner-disposition-2026-10-03-batch-owed-tooling.md:74` | §4 item 6 lists "C0 N3, N4" as closed; the plan §6, the handoff and open_blockers[191]'s append say only N4's first half is, the lint message staying owed. | Say "C0 N3, N4's first half" in the next record that touches it (append-only). |

No finding is MEDIUM or above. Nothing in §4 is newly opened by this batch: A1-OT-1, -4 and -I2 predate it, and
A1-OT-2 and -3 are the new static checks being weaker than worded, with the live layers holding what they miss
(A1-OT-2's 170 is an integrated migration whose apply-time content the live layers do not re-read, which is why
it is graded at all).

## 5. Are the claims true?

| Claim (commit messages, plan, disposition, blocker appends, handoff) | Verdict |
|---|---|
| No migration; no grant, policy, role, contract or decision changed | TRUE (diff: 17 paths, no `.sql`; V1) |
| 51 triggers on 47 tables, four functions, both ways | TRUE (L0, and the exported lists: 45 set_updated_at tables + 6) |
| The workspaces lifecycle trigger and a private-table trigger are refused by name | TRUE (L0 self-tests); but see A1-OT-1 for a catalog-written one |
| `_how_measured` names the last migration and the version; `--check` 0 | TRUE (L1) |
| Blocker citations by quote; open_blockers appends only | TRUE (script: six entries, each its base text plus an append) |
| Rules 7 and 8: schema owner, USAGE/CREATE, six attributes, empty default ACL | TRUE (L0 claim line; L6 refused by name) |
| COPY ... TO/FROM PROGRAM refused in every fed source, computed words not read | TRUE as stated (S1; L8 measures the limit) |
| Redaction from the raw query; `#?host=` prints "[redacted]" | TRUE for the query (S1, L10); the authority is A1-OT-4 |
| Index coverage reads collation and opclass | TRUE (L0: index coverage probe's self-tests refused, its claim line) |
| Item 1 "an ALLOWLIST"; "nine drifts refused" | Nine refused, TRUE; "allowlist" in form only: A1-OT-2 |
| Item 6 tripwire "each spelling pinned", limit "a dynamic EXECUTE" | OVERSTATED: A1-OT-3 |
| Disposition: Owner's words verbatim, A0 executing the standing delegation for #175 | TRUE as to the words (they match the relayed request) and the merge facts (gh: merge `5558b26`, head `ab7db39`, run 37181470982 success); the delegation's reading is A0's, as the file says |
| Disposition §4 item 6 "C0 N3, N4" closed | Partly: A1-OT-I3 |
| `verify`, `check:handoff`, branch scope green on the branch name | TRUE (V1-V3; 684 of 684) |
| 70ab5ca a plain commit because commit-when-clean refused only on the handoff guard | Not re-measured (the state before the handoff refresh is gone); consistent with V2 passing after `af394fa` |

## 6. Stop-the-line and merge

**Stop-the-line: no.** No secret, tenant leak, side effect, lost job, migration divergence or contract mismatch is
introduced; the batch only adds assertions and tooling, and every live drift that the new rules claim is refused
by name.

**Does anything here block the merge? No.** All findings are LOW or INFO, pre-existing or about wording and
static backstops the live layers cover; each can be recorded on the blockers with its owner. A1-OT-1 and
A1-OT-2 are the two I would close first, because each reopens the exact finding its item closes by a different
spelling.

## 7. Limits

- Same vendor and model family as the Author (§0).
- The bypasses in §3.1 and §3.2 were measured on the test's code copied byte for byte into a script, not by
  editing the test or 170; 170 is integrated and was not touched.
- A1-OT-4's leaks were measured with crafted URLs against `.invalid` names and a local cluster; no real credential
  was used. Which other `scripts/db` targets share `redactConnection` beyond the two run was not enumerated.
- I did not re-run A0's mutations (M1-M11) and did not re-run rls-smoke twice per database.
- The `70ab5ca` commit-when-clean refusal is read, not re-measured.
- I fixed nothing, approved nothing and answered no Q-id. I did not push. I made no commit on the branch name.
