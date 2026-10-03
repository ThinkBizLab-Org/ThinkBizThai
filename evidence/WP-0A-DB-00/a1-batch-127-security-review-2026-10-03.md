# A1 Security/Privacy review: batch 127 (created_by at INSERT is the caller; every client-writable table's permissive set pinned)

- **Package:** `WP-0A-DB-00`. **Role run:** `/claude/a1_bastion`, independent Security/Privacy reviewer.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-127`, PR
  <https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/166> (Draft), head `75dae71` (handoff alone) over
  code `4fef70a`, base `3f80599` (`main`, PR #165). Author `/claude/a0_atlas`.
- **Checkout:** I checked the head out as my own local branch `review/a1-batch-127` (at `75dae71`). The
  handoff guard judges a branch by the name a manifest declares, and the Author's branch name is checked
  out in another worktree, so I ran the name-sensitive commands in a private clone checked out as
  `agent/claude/WP-0A-DB-00-batch-127` at `75dae71`, with `origin/main` = `3f80599` and `origin/HEAD`
  pointed at `origin/main` (a fresh clone points it at the source's HEAD). Not detached.
- **Date:** 2026-10-03.

**This document records review findings. It advances no package status, signs nothing on anyone's
behalf and approves nothing.** I do not fix; nothing in the subject was changed by this run.

## 0. What I am

I am a subagent spawned by `/claude/a0_atlas`, the Author of the change under review, of the same
vendor and model family (RFC-2026-024). The Author chose what to point me at. Whether this review
counts as the Security/Privacy role's signature is not mine to decide: accepting it as that signature is
the Integration Owner's and the Product Owner's act.

## 1. Measured vs read

**Measured** (PostgreSQL 17.11 at /opt/homebrew/bin; `initdb --locale=C -A trust -U postgres`;
127.0.0.1:5501, TCP only, `-c unix_socket_directories=''`; `LC_ALL=C`; `db/foundation/ci/supabase-shim.sql`
first; Node 24.20.0 first on PATH; a fresh initdb for every round; every drift appended to
`db/foundation/migrations/140_audit.sql` of the private clone and restored byte for byte after each
round, checked with `cmp`; the cluster stopped and its data directory removed at the end):

| Command | Exit | Output |
|---|---|---|
| `node scripts/verify-branch-scope.mjs 3f80599 WP-0A-DB-00` (review branch and the named clone) | **0**, **0** | all 25 changed paths declared, every amendment explains one |
| `npm run check:handoff` on the branch name | **0** | "describes the branch: nothing substantive after its cited head" |
| `npm run check:handoff` on `review/a1-batch-127` (control) | 75 | no manifest declares that branch (expected) |
| `npm run verify` on the branch name | **0** | "clean: exit 0 — tests 677, pass 677, fail 0" |
| `make db-migrate-clean`, `make db-rls-smoke` (base round, and a final round) | **0**, **0** | 19 catalog probes plus the ceiling probe, each refusing its drift; 49 apply-time blocks (37 as written, 12 replaced); 1077 isolation cases passed |
| `gh pr view 166` | - | Draft, head `75dae71`, required check "Bootstrap validation" **success** (run 37116932386) |
| `gh pr view 165`, `gh run view 37111859581` | - | merged 2026-10-03T10:08:51Z at head `84df4d4`, merge commit `3f80599`; run on `84df4d4` success |

Catalog facts re-measured on the clean set (each matches the plan §1): authenticated may INSERT
created_by on **19** relations, all `app`, all relkind `r` (searched every non-system schema and relkinds
r, p, v, m, f); 19 restrictive `<table>_created_by_is_caller` policies; created_by nullable with no
default on all 19; `*_by` columns client-insertable: created_by 19, updated_by 14, requested_by 2 (35);
client-writable `app` tables **25**, permissive policies on them **74** (24 INSERT, 25 SELECT, 25 UPDATE);
anon holds no write on any `app` relation; no client role holds UPDATE on created_by anywhere; no
client role holds CREATE on any schema; `public` has 0 relations; 0 rewrite rules besides `_RETURN`;
5 SECURITY DEFINER functions, 2 executable by clients (`app.is_active_member`,
`app.workspace_member_role`, both read-only lookups); no function body in any non-system schema
mentions created_by; no trigger on a created_by table writes it.

**Read, not measured:** the plan, the disposition, `git diff 3f80599..75dae71`, blocker 186's text
(open_blockers index 185), the psqlLex additions (`scripts/db/psql-driver.mjs:349`, `:427`) and their
static shapes (`test-kits/db/foundation-contract.test.mjs:2172-2184`). For question (3) I did not build
or run new lexer-evasion inputs; see §6.

## 2. Answers to the four questions

### (1) Can created_by still be forged at INSERT?

**On the clean set: no, by every path I tried.** As the owner of workspace A, naming A's admin as
created_by, on `app.content_ideas` (private `forge.sql`, all rolled back): plain INSERT, a
data-modifying CTE, INSERT ... SELECT, ON CONFLICT DO NOTHING, ON CONFLICT DO UPDATE with the forged
row both conflicting and not, MERGE WHEN NOT MATCHED INSERT, PREPARE/EXECUTE, a DO block, a
caller-made `pg_temp` SECURITY DEFINER wrapper (its definer is the caller), and created_by omitted
(NULL): **every one refused**. ON CONFLICT DO UPDATE SET created_by and MERGE WHEN MATCHED UPDATE SET
created_by: `permission denied` (no UPDATE grant on the column). COPY FROM: refused under RLS. The
twin with created_by = caller: INSERT 0 1.

**With a looser permissive sibling in place** (R1, `content_ideas_insert_any ... with check (true)`),
the same paths were refused **by name** by `content_ideas_created_by_is_caller`: the closure holds on
its own. The 19 closures are one text, pinned per table by the created_by closure probe, and the 19
rls-smoke created_by-alone cases passed in every clean round, so I did not repeat the paths on each table.

Through a table the set missed: none exists (19 of 19 tables, all in `app`). A SECURITY DEFINER
function, a trigger or a rule: none writes created_by. **Through a view or through schema public: no
such object exists today, but a later migration can create one that every layer passes. That is F1
(view, measured) and F2 (public, re-measured, already owed).**

### (2) Does the permissive-set pin catch the four shapes?

Yes, each by name at migrate-clean:

| Id | Drift | static | mc | rs | Probe output |
|---|---|---|---|---|---|
| R1 | looser INSERT sibling `content_ideas_insert_any`, `with check (true)` | 0 | **2** | 2 (1 case: `viewer-a-cannot-capture-a-content-idea`) | `unlisted or changed: app.content_ideas.content_ideas_insert_any` |
| R2 | `content_items_select_active_member` renamed, text unchanged | 0 | **2** | **0** | missing `...select_active_member`; unlisted `...select_member` |
| R3 | `content_items_update_writer` dropped and recreated FOR ALL with the same name and texts | 0 | **2** | **0** | missing or changed, and unlisted or changed, `app.content_items.content_items_update_writer` |
| R4 | new `app.a1_probe`, RLS forced, INSERT granted, permissive `with check (true)` | 0 | **2** | **0** | `unlisted or changed: app.a1_probe.a1_probe_insert` |
| R4b | `grant update (body) on app.content_versions` (a read-only table becomes client-writable) | 0 | **2** | 2 (1 case) | `unlisted or changed: app.content_versions.content_versions_select_active_member` |

R2, R3 and R4 are held by the permissive probe **alone**. Guard mutations (private `mutate.mjs`,
applied to the clone, `node --test test-kits/db/foundation-contract.test.mjs`, file restored and
compared): M4 (the probe dropped from `CATALOG_RULE_PROBES`) exit 1; M5 (the probe's `found` narrowed to
non-SELECT policies) exit 1. Both are held statically.

### (3) The psqlLex additions

Read: the `client_encoding` mention rule runs unconditionally over the whole text
(`psql-driver.mjs:349`), so every spelling that contains the literal name (SET, RESET, SET ... TO
DEFAULT, set_config, ALTER ROLE/DATABASE ... SET, a comment) is refused before anything is fed. The SET
NAMES rule matches a statement head (`:427`). The odd-run rule is `run % 2 === 1` (`:391`). Guard
mutations, each held statically: M1 (`run === 1`), M2 (the client_encoding rule removed), M3 (the SET
NAMES rule removed): exit 1 each. The XODD3B, run-of-3/5 and run-of-4/6 shapes are in the static test.

The residual is the one A0 names (plan §5.1; `psql-driver.mjs:324-334`): a client-encoding change whose
name psql never sees spelled out. Any server-accepted spelling of the setting's name that does not contain
the literal substring belongs to that same owed class. No new class is evident from reading. I did not
probe it live (§6).

### (4) Anything newly opened?

**Nothing found.** 127 adds 19 restrictive INSERT policies, which can only narrow, and three read-only
catalog probes. It changes no grant, function, trigger or default. The replacements in
`db/foundation/invariants/` widen fails_with counts by exactly 127's closures (read).

## 3. Findings

### F1 — MEDIUM (pre-existing, not opened by 127; not live): a view with security_invoker switched off by ALTER VIEW passes every layer, and through it a client forges created_by and crosses tenants

- **Where:** `scripts/db/run.mjs:1372-1374` (schema-lint matches only `create [or replace] view app.X ...`
  text without `security_invoker`); `scripts/db/run.mjs:2273-2276` reads `exposed_views` from the
  committed catalog snapshot (000-010), not from the live database; every live probe, 127's block
  (`127_created_by_on_insert_is_caller.sql:107`), the INSERT coverage probe (`run.mjs:280`) and the
  permissive policy probe (`run.mjs:387`) read relkind `r`, `p` only.
- **Measured (R5b):** appended to 140: `create view app.a1_ideas_v with (security_invoker = true) as
  select ... from app.content_ideas; alter view app.a1_ideas_v set (security_invoker = false); grant
  select, insert on app.a1_ideas_v to authenticated;`. Result: schema-lint **0**, foundation-contract **0**,
  migrate-clean **0**, rls-smoke **0** (1077 pass). On that database, as the owner of A: INSERT through
  the view naming A's admin as created_by, **INSERT 0 1**; INSERT through the view into workspace B,
  **INSERT 0 1**; SELECT through the view, **rows of 2 workspaces visible**. The view's owner is the
  migrating superuser, which bypasses RLS, so 127's closure and every tenant policy are skipped.
- **Control (R5):** the same view created without `security_invoker` and not altered is caught by
  schema-lint (exit 2, `view app.a1_ideas_v is not security_invoker — §8.5`); mc and rs still pass it.
- **Why MEDIUM and not stop-the-line:** no view exists on the clean set, so nothing is reachable today.
  It needs a later migration, which a reviewer reads. But the class bypasses tenant isolation as well as
  attribution, and the repository's own rule (§8.5, security_invoker) is enforced on text only.
- **Remedy:** a live catalog probe in `CATALOG_RULE_PROBES` (with its own self-test drift: R5b's shape):
  every relation of relkind `v` or `m` in any schema on which `anon` or `authenticated` holds any
  privilege must carry `security_invoker=true` in `reloptions` (a materialized view must have no client
  privilege at all). Alternatively, widen the coverage and permissive probes' relkind filter to include
  `v`. Either one closes the attribution half of question (1) for views.

### F2 — LOW (re-measured; already owed as A1 F6 on 123 / Q0 F6, recorded on blocker 186)

Schema `public`: R6 (`public.a1_pub`, created_by, RLS enabled, allow-everything INSERT policy, INSERT
granted to authenticated) passes static, mc and rs (0/0/0), and a client INSERT naming another user and
another workspace returned **INSERT 0 1**. Clients hold USAGE but not CREATE on `public`, and `public`
holds no relations today. Nothing new. Blocker 186 and plan §5.2 state it correctly.

### F3 — INFO: the permissive pin covers client-writable tables only; read-only tables rely on rls-smoke and restrictive narrowings

The Owner's item (3) named client-writable tables, and the probe does exactly that. Measured on
read-only client tables: R7 (`content_versions_select_active_member` → `using (true)`): every layer green,
**no leak**. Owner A still saw only A's 4 rows, held by the restrictive `content_versions_scope_narrowing`
(which joins `content_items` under its own RLS). R7b (`billing_subscriptions_select_owner` →
`using (true)`): mc 0, **rs 2** (5 cases). R7c (`workspace_members_select_workspace_roster` →
`using (true)`): mc 0, **rs 2** (3 cases and the authz proof `app-authz-policy-is-load-bearing`). R8
(`content_ideas_scope_narrowing` gutted): mc 2 by the post-migrate pass (080's replacement). So no
measured read-side gap. If the Owner wants the read side caught at migrate-clean too, extend the probe's
`writable` set to any client privilege, SELECT included (18 more permissive policies, all SELECT, on 16
tables a client cannot write, measured).

### F4 — INFO: one "not done" item in A0's report is now resolved

A0 listed "the CI result of PR #166 not yet seen". Measured: required check "Bootstrap validation"
**success** on `75dae71` (run 37116932386, completed 2026-10-03T10:41:12Z).

## 4. Claims checked

| Claim (where) | Verdict |
|---|---|
| 19 tables, 24 permissive INSERT policies, 35 `*_by` INSERT columns (plan §1; migration header; `run.mjs` comment) | TRUE (measured) |
| 25 client-writable tables, 74 permissive policies (24/25/25), all TO authenticated, anon none (plan §1; README) | TRUE (measured) |
| Nineteen probes (README, plan §3) | TRUE: 19 in `CATALOG_RULE_PROBES` (counted), plus the ceiling probe line |
| 49 apply-time blocks, 37 as written, 12 replaced; 1077 cases (plan §3; blocker 186) | TRUE (measured, twice) |
| 677 tests (VERIFICATION.md, plan §3, A0's done list) | TRUE (`npm run verify` 677/677) |
| D1-D7 verdicts (plan §4) | Consistent with my independent R1-R4b. I did not repeat D1-D7 one for one |
| M1-M4 held statically (plan §4) | TRUE (measured; plus M5) |
| #165 merged at `84df4d4` → `3f80599`, 10:08:51Z, run 37111859581 green (disposition §3) | TRUE (gh) |
| Disposition: A0 EXECUTED and did not decide; RFC-2026-025 §5 open; RFC-2026-002 not met literally when A0 presses | Accurately stated. The Owner's words are relayed to this run verbatim by the harness, and I did not see the session either |
| Blocker 186: created_by class and 091's two tables CLOSED BY BATCH 127; odd runs and spelled-out client_encoding closed; computed names, schema public and remedy (b) owed | TRUE as written. It does not mention views (F1) |
| Commit messages `e5104bf`, `4fef70a`, `554a9c3`, `75dae71` | Subjects consistent with the diff stat and the plan's commit list; bodies not audited line by line |
| Branch scope: plan says 24 paths at `4fef70a` | TRUE at that commit; 25 at `75dae71` (plus the disposition and the handoff, minus the renamed draft) |

## 5. Stop-the-line and the Owner's merge

**No stop-the-line.** Every negative control I ran reproduced, and nothing I found is reachable by a
client on the clean set. **Nothing in this review blocks the Owner's merge of #166.** F1 is
pre-existing and needs a later migration. I recommend it for the next hardening batch with F2. Whether
this run counts as the A1 signature, and the merge itself, are the Owner's and the Integration Owner's
to decide.

## 6. Limits

- One model family reviewing its own Author's work (§0).
- The forging paths were run on `app.content_ideas` only. The other 18 tables rest on the identical
  pinned closure text and on the 19 rls-smoke created_by-alone cases.
- Question (3) was answered by reading and by guard mutations only. I did not build or run new
  lexer-evasion inputs (shell-escape or encoding payloads) in this run. Whether any spelling outside the
  literal-substring rule reaches psql is the owed class A0 already names, and is not re-measured here.
- Other roles' reach (`app_worker`, `service_role`, RFC-2026-023 command roles) was not examined beyond
  the anon/authenticated questions asked.
- Private artefacts (not in the repository):
  `/private/tmp/claude-501/-Users-bank-ThinkBizThai/27edf3de-b1b4-4cfe-a757-7d17332ec256/scratchpad/a1-127/`:
  `round.sh`, `lint.sh`, `mkdrifts.mjs` and the `d*.sql` drifts, `forge.sql`, `forge-view.sql`,
  `read-r7.sql`, `mutate.mjs`, `b186.mjs`, the per-round logs, the pristine copy of `140_audit.sql`, and
  the named clone. Port 5501 is closed; the data directory is removed; `140_audit.sql` in the worktree and
  the clone is byte-identical to the pristine copy.
