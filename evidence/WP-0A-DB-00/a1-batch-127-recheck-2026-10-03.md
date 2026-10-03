# A1 Security/Privacy re-check: batch 127's review round

- **Package:** `WP-0A-DB-00`. **Role run:** `/claude/a1_bastion`, independent Security/Privacy reviewer.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-127`, PR
  <https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/166> (Draft), head `55a1f72` (handoff alone) over
  code `610b2d3` and record `dc5a7ce`; previous reviewed head `75dae71`; base `3f80599` (`main`). Author
  `/claude/a0_atlas`.
- **Checkout:** I checked the head out as my own local branch `recheck/a1-batch-127-r2` (at `55a1f72`)
  and ran the drift rounds there. The Author's branch name is checked out in another worktree, so I ran
  the name-sensitive commands (`check:handoff`, `verify`) in a private clone checked out as
  `agent/claude/WP-0A-DB-00-batch-127` at `55a1f72`, with `origin/main` = `3f80599` and `origin/HEAD`
  pointed at it. Not detached.
- **Earlier review:** `evidence/WP-0A-DB-00/a1-batch-127-security-review-2026-10-03.md` (F1 MEDIUM view,
  F2 LOW schema public).
- **Date:** 2026-10-03.

**This document records findings. It advances no package status, signs nothing on anyone's behalf
and approves nothing.** I do not fix; nothing in the subject was changed by this run.

## 0. What I am

I am a subagent spawned by `/claude/a0_atlas`, the Author of the change under review. I am of the same
vendor and model family (RFC-2026-024), and the Author chose what to point me at. Whether this re-check
counts as the Security/Privacy role's signature is not for me to decide. Accepting it as that signature
is the Integration Owner's and the Product Owner's act.

## 1. Measured vs read

**Measured.** Setup: PostgreSQL 17 at /opt/homebrew/bin; `initdb --locale=C -A trust -U postgres`;
127.0.0.1:5501, TCP only, `-c unix_socket_directories=''`; `LC_ALL=C`; `db/foundation/ci/supabase-shim.sql`
first. Node `v24.20.0` was checked by the round script before every measured run. Every round used a
fresh initdb. Each drift was appended to `db/foundation/migrations/140_audit.sql` and restored byte for
byte after every round (checked with `cmp` each time, and again at the end). Destructive statements ran
only inside transactions that were rolled back. At the end the cluster was stopped and its data
directory removed.

| Command | Exit | Output |
|---|---|---|
| `make db-migrate-clean`, `make db-rls-smoke` (two clean rounds) | **0**, **0** | 21 catalog probes plus the ceiling probe, each refusing every drift (client privilege probe: 3 of 3); post-migrate pass 49 blocks (37 as written, 12 replaced); **1078** isolation cases passed |
| `node scripts/verify-branch-scope.mjs 3f80599 WP-0A-DB-00` | **0** | all 28 changed paths declared |
| `npm ci --ignore-scripts`, `npm run check:handoff` on the branch name | **0**, **0** | "describes the branch: nothing substantive after its cited head" |
| `npm run verify` on the branch name | **0** | "clean: exit 0 — tests 677, pass 677, fail 0" |
| `gh pr view 166` | - | OPEN, Draft, head `55a1f72`; check `bootstrap` **SUCCESS** (run 37119566871) |

Catalog facts on the clean set (each matches A0's record): 33 restrictive `*_scope_narrow*` policies,
all FOR ALL, TO authenticated, with both halves. With the 3 earlier pins, that makes the 36 in
`PINNED_POLICIES`. There are 117 restrictive policies in all, 26 of them `*_service_path_closed`, which
are not pinned by deparse (owed, plan §7.4 item 4). No view, materialized view or foreign table exists
in any non-system schema. No client role (anon, authenticated, PUBLIC) holds any privilege on any
relation outside `app`. Clients hold schema USAGE on `app` and `public` only and CREATE on none. anon
and authenticated are members of no role. No SECURITY DEFINER function is an extension member. Clients
may execute exactly 2 SECURITY DEFINER functions, `app.is_active_member` and `app.workspace_member_role`.

**Read, not measured:** `git diff 75dae71..55a1f72` for `scripts/db/run.mjs` (the client privilege and
policy helper probes, the 31 new `PINNED_POLICIES`) and `scripts/db/psql-driver.mjs` (the SET NAMES rule
at `:339`), plan §5 and §7. I did not re-test the new rls-smoke case `user-a-cannot-update-user-b-profile`
on its own. It ran green inside the 1078, and Q0 owns that check.

## 2. The F1 and F2 variants, per layer

static = `make db-schema-lint` / `node --test test-kits/db/foundation-contract.test.mjs`; mc =
`make db-migrate-clean`; rs = `make db-rls-smoke`. Every row is a fresh cluster with the drift appended to 140.

| Id | Drift | static | mc | rs | Held by |
|---|---|---|---|---|---|
| V01 | F1 again (R5b): invoker view, `alter view ... set (security_invoker = false)`, SELECT+INSERT to authenticated | 0/0 | **2** | 0 | client privilege probe rule 2, `app.a1_ideas_v` |
| V02 | invoker-off view in `private`, USAGE on private granted | 0/0 | **2** | 2 | rule 2, `private.a1_ideas_v` |
| V03 | invoker-off view in `public`, SELECT+INSERT to **PUBLIC** | 0/0 | **2** | 0 | rule 2, `public.a1_ideas_v` |
| V04 | populated materialized view in `app`, SELECT to authenticated | 0/0 | **2** | 0 | rule 2, `app.a1_ideas_mv` |
| V05 | invoker-off view **owned by `app_worker`** (granted the table) | 2/1 | **2** | 2 | schema-lint §8.5 and rule 2 |
| V06 | SECURITY DEFINER `app.a1_all_ideas() returns setof app.content_ideas`, `search_path=''`, EXECUTE to authenticated | 0/0 | **2** | 0 | security definer probe, "not a pinned SECURITY DEFINER function" |
| V06b | V06, then `alter extension pgcrypto add function app.a1_all_ideas()` | 0/0 | **0** | **0** | **nothing (N2)** |
| V07 | rule-based updatable view (DISTINCT, `DO INSTEAD INSERT INTO app.content_ideas`), security_invoker, granted | 0/0 | **2** | 0 | rule 2 and the rewrite rule probe |
| V08 | foreign table in `app` (handler-less FDW), SELECT+INSERT to authenticated | 0/0 | **2** | 0 | rule 2, `app.a1_ft` |
| V09 | F2 again (R6): allow-everything table in `public` | 0/0 | **2** | 0 | rule 3, `public.a1_pub` |
| V10a-d | TRUNCATE to authenticated; TRIGGER to anon; REFERENCES (one column) to PUBLIC; MAINTAIN to authenticated (each in its own round) | 0/0 | **2** each | 0 | rule 1, each named (PUBLIC's REFERENCES named for all three roles) |
| V11 | **new schema** `a1_api`, USAGE to authenticated, invoker-off view on content_ideas, SELECT+INSERT | 0/0 | **0** | **0** | **nothing (N1)** |
| V12 | the same view in the shim schema `auth` | 2/1 | 0 | 0 | schema-lint §3.1 only |
| V13 | new schema, a table without RLS, ALL to authenticated | 0/0 | **0** | **0** | **nothing (N1)** |
| V14 | TRUNCATE+SELECT on content_ideas to `app_maintenance`; `grant app_maintenance to authenticated` | 0/0 | **2** | 0 | 082's post-migrate block (content service path), not a membership rule |
| V14b | V14 `with inherit true` | 0/0 | **2** | 0 | rule 1 (inherited TRUNCATE) |
| V14c | V14 on `app.notifications` | 0/0 | **0** | 0 | nothing (see N3) |
| V14d | `grant postgres to authenticated` | 0/0 | **0** | **0** | **nothing (N3)** |
| V15 | `alter table app.notifications owner to authenticated` | 0/0 | **2** | 2 | rule 1 (owner's TRUNCATE/TRIGGER/REFERENCES/MAINTAIN) |
| V16 | `grant create on schema app to authenticated` | 0/0 | **0** | 0 | nothing (N5) |

**Exploit on the database with V06b, V11, V13, V14c and V14d applied together** (mc 0, rs 0, static
0/0). Run as `authenticated` with the owner of workspace A as `sub`, everything rolled back. The
superuser count was 2 content_ideas rows over 2 workspaces:

- control, direct `select` on `app.content_ideas`: **1** workspace visible;
- `app.a1_all_ideas()` (V06b): **2** workspaces visible;
- `a1_api.ideas` (V11): **2** workspaces visible; `insert` into workspace B naming another user as
  created_by: **INSERT 0 1**;
- `a1_api.notes` (V13): another tenant's row inserted and read back;
- `set local role postgres` (V14d): `current_user = postgres`, `rolsuper = t`, 2 workspaces visible;
- `set local role app_maintenance; truncate app.notifications` (V14c): `permission denied for schema
  app`. The role has no USAGE there, so this exact shape is not reachable.

## 3. Findings

### N1 — MEDIUM (not live; the round's fix is scoped to three schemas): a view or table in any other schema passes every layer and crosses tenants

- **Where:** `scripts/db/run.mjs` `CLIENT_PRIVILEGE_PROBE_SQL`. All three rules read
  `n.nspname in ('app', 'private', 'public')`. The claim in plan §7.1 ("a client cannot use a view at
  all, so nothing reaches past those checks through one") and the probe's "fail-closed" comment hold only
  inside those three schemas.
- **Measured:** V11 and V13 above. A migration that runs `create schema X; grant usage on schema X to
  authenticated;` and then creates an invoker-off view, or a table with no RLS, passes static, mc and
  rs. Through the view, owner A read 2 workspaces and wrote into workspace B with a forged created_by.
  That is A1 F1's reach exactly, in a different schema. An `api` schema exposed to PostgREST is an
  ordinary Supabase pattern, so this is a plausible honest mistake, not only an adversarial one. The shim
  schema `auth` is caught by schema-lint §3.1 (V12), and `extensions` was not tried.
- **Why not stop-the-line:** on the clean set clients hold USAGE on `app` and `public` only (measured), and
  no relation exists outside `app` and `private`. Exploiting it needs a later migration.
- **Remedy (for A0):** pin the schemas a client may use. Any non-system schema on which anon,
  authenticated or PUBLIC holds USAGE must be in a pinned list (`app`, `public` today), with a self-test
  drift shaped like V11. Alternatively, run rules 1-3 over every schema except `pg_catalog`,
  `information_schema` and `pg_toast`.

### N2 — LOW (pre-existing; not opened by this round): a SECURITY DEFINER function made an extension member escapes the definer probe

- **Where:** `scripts/db/run.mjs:623`. The definer probe skips any function with a `pg_depend` row of
  `deptype = 'e'`. That exclusion was already present at `3f80599`.
- **Measured:** V06b. `alter extension pgcrypto add function app.a1_all_ideas()` (pgcrypto is installed
  in schema `extensions`) and a client reads every tenant's content_ideas. Every layer is green. V06,
  without the ALTER EXTENSION, is caught by name. Plan §5.2 and §7.4 item 3 say "a SECURITY DEFINER one
  is the definer probe's, in every schema", which is true except for extension members.
- **Why LOW:** the statement exists only to hide the function, and a reviewer reading the migration sees it.
- **Remedy:** exempt only functions whose extension is in a pinned list **and** whose schema is that
  extension's own schema. Or refuse any extension-member function outside the extension's schema.

### N3 — LOW (pre-existing; not opened by this round): no layer reads what the client roles are members of

- **Measured:** V14d `grant postgres to authenticated` passes static, mc and rs. A session running as
  `authenticated` then `set local role postgres` becomes superuser and sees every tenant. V14c (a
  service role granted TRUNCATE, clients made members with SET but no INHERIT) also passes every layer.
  As written it is stopped only because that role lacks USAGE on `app`. `authenticated` is NOINHERIT,
  so `has_table_privilege` (rule 1) does not see privileges reachable through SET ROLE. V14b with
  INHERIT is caught.
- **Why LOW:** a PostgREST client cannot issue SET ROLE, so exploiting this needs a SQL-execution path
  as well as a migration. `authzLint` checks `authenticator`'s memberships only, from the snapshot. This
  is next to, but not the same as, A0's owed item "other roles' reach" (plan §7.4 item 2): this one is
  about what the client roles can become.
- **Remedy:** a live rule that anon and authenticated are members of no role (and that PUBLIC cannot be),
  with a V14d-shaped drift.

### N4 — LOW: the client-encoding limit is narrower in the record than in fact. A static spelling, not only a computed one, passes psqlLex

- **Where:** `scripts/db/psql-driver.mjs:331-336` and `:353` (a literal `/client_encoding/gi`). Plan §5.1
  and §7.4 item 1, README and blocker 186 now say the residual is only a name or SET words "computed at
  run time".
- **Measured (lexer, private `lex.mjs`):** `psqlLex` returns **no** finding for
  `set U&"client\005fencoding" to 'SJIS'`, the same with `UESCAPE '!'`,
  `select set_config(U&'client\005fencoding', ...)`, `select set_config(E'client\137encoding', ...)` and a
  DO body executing the U& form. The controls `set client_encoding ...` and C0's
  `execute 'set names ''SJIS'''` are refused.
- **Measured (server):** in psql on my cluster, each of the three static spellings moved psql's
  `\encoding` to SJIS, BIG5 and GBK respectively.
- **Not measured:** an end-to-end smuggle of a statement past the lexer after such a switch. The
  consequence is the same as the class A0 already owes, but the record's "computed only" wording is
  inaccurate.
- **Remedy:** reword the limit to "any spelling of the name the literal rule does not see (computed, U&
  escapes, E'' escapes)". Or refuse `U&` identifiers and literals, and `set_config(` with anything but a
  plain literal, in fed text (cheap to measure against the 87 files).

### N5 — INFO: CREATE on a schema for clients is not read by any layer

V16 (`grant create on schema app to authenticated`) passes every layer. I found nothing a client gains
from it alone: policies bind helpers by OID, and the definer functions have empty search paths. I did
not build an exploit. Clients hold CREATE on no schema today (measured). The N1 remedy (pinning schema
privileges) would cover CREATE in the same rule at no extra cost.

### N6 — INFO: what this round closed, confirmed

A1 F1 (V01-V05, V07, V08) and A1 F2 (V09) are refused by name at migrate-clean, inside `app`, `private`
and `public`. So are TRUNCATE, TRIGGER, REFERENCES (column-level) and MAINTAIN to anon, authenticated
or PUBLIC (V10a-d), a client-owned table (V15), and inherited TRUNCATE (V14b). Nothing that held at
`75dae71` stopped holding: the clean rounds pass every probe and all 1078 cases. A0's "not done" item
"CI on 55a1f72 still running" is now resolved: run 37119566871 is green.

### Newly opened?

**Nothing newly opened by the review round.** The round adds read-only catalog probes, 31 pins and one
rls-smoke case, and changes no grant, function, policy, trigger or default. N1 lies outside the new
probe's reach, not something the probe opened. N2 and N3 were there at the base.

## 4. Claims checked

| Claim (where) | Verdict |
|---|---|
| Client privilege probe, 3 rules, each with its own drift; both allowlists empty (A0 done list; plan §7.1) | TRUE (mc self-test 3 of 3; `CLIENT_VIEWS`, `CLIENT_NON_APP_TABLES` = `{}`) |
| "fail closed … no path through a view escapes those probes" (A0 not-done list; plan §7.1) | **TRUE only within app, private and public** (N1) |
| 31 more narrowings pinned, 36 in all; 33 narrowings FOR ALL, TO authenticated, both halves | TRUE (measured) |
| Policy helper probe: 5 helpers, every function a policy calls is pinned | TRUE as built (mc self-test 2 of 2) |
| "a SECURITY DEFINER one is the definer probe's, in every schema" (plan §5.2, §7.4) | TRUE except for extension members (N2) |
| 1078 cases; 21 probes; 677 tests; `check:handoff` and `verify` exit 0 on the branch name | TRUE (measured) |
| SET NAMES refused anywhere; limit now only computed names or words (A0 done list; plan §5.1) | First half TRUE (C0's DO-body shape refused). Second half **inaccurate** (N4) |
| Branch scope 28 paths | TRUE (measured) |

## 5. Stop-the-line and the Owner's merge

**No stop-the-line.** On the clean set, a client reaches nothing I found. N1-N3 each need a later
migration, and N4 needs a migration that changes the encoding. **Nothing in this re-check blocks the
Owner's merge of #166.** The round closes what it set out to close, inside the schemas it names. N1 is
the one I would put first in the next hardening batch, because it reopens A1 F1's reach through an
ordinary pattern. N2-N4 can go with it on blocker 186. Whether this run counts as the A1 signature,
and the merge itself, are for the Owner and the Integration Owner to decide.

## 6. Limits

- One model family reviewing its own Author's work (§0).
- I did not re-run batch 127's original drift and mutation set (D1-D7, L1-L3, M1-M5) or my earlier
  forging paths. The clean rounds and the probes' self-tests are the regression evidence.
- `extensions` and other shim schemas were not each probed for N1. V12 shows `auth` is caught statically.
- N4: measured at the lexer and at psql's reported encoding. I did not build an end-to-end statement
  smuggle.
- The other roles' reach (`app_worker`, `service_role`, RFC-2026-023 command roles) was not examined
  beyond N3's client-membership question.
- Private artefacts (not in the repository), in
  `/private/tmp/claude-501/-Users-bank-ThinkBizThai/27edf3de-b1b4-4cfe-a757-7d17332ec256/scratchpad/a1-127r2/`:
  `round.sh`, `lint.sh`, `all.sh`, `drifts.txt` and `split.mjs` with the `v*.sql` drifts, `x-combined.sql`,
  `exploit.sql` and `exploit-x.log`, `lex.mjs`, `enc.sql`, `cat.sql`, `facts.sql`, `verify.sh`, the
  per-round logs, the pristine copy of `140_audit.sql` and the named clone. Port 5501 is closed and the
  data directory is removed. `140_audit.sql` in the worktree is byte-identical to the pristine copy.
