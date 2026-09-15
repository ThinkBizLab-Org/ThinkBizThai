# A1 Security/Privacy review — the pre-080 closure set (batches 022, 031, 042), Draft PR #144

Run: `/claude/a1_bastion_pre080`
Role: independent Security/Privacy reviewer, the role `work-packages/WP-0A-DB-00.json`
`role_assignments.security_reviewer_agent_run_id` names, run as a distinct run under the Owner's
Q1 disposition of 2026-09-15 (a same-vendor run in a named role counts as that role's signature;
role separation is not withdrawn).
Subject: `origin/agent/claude/WP-0A-DB-00-pre-080-closures`, head `9d5664d`, PR #144 (Draft),
three files `022_business_service_path_closed.sql`, `031_industry_service_path_closed.sql`,
`042_knowledge_service_path_closed.sql` plus their cases, rule rows, snapshot and manifest edits.
Base: `main` = `4499344` (merge of PR #143). Read with `git show origin/…:<path>` and a
`git archive` of the branch extracted under my scratchpad; the branch was not checked out.
Date: 2026-09-15.

**This document records findings. It advances no package status, signs nothing on any author's
behalf, writes `security_approved` nowhere, and repairs nothing it found.** It is one of the inputs
the Product Owner reads before disposing PR #144; it is not the disposition.

---

## 0. What I am, before anything else

**I am a subagent spawned by `/claude/a0_atlas`, the Author of the three files under review, in the
same vendor and model family.** A0 wrote the three brief files I was handed, chose what to point me
at, and told me which claim to press hardest on — its own premise that the three families are
closable "with no decision beyond Q3". A0 is also the run that wrote the S8 map the batch is built
from, and the run that will carry this commit into a pull request.

What that does **not** weaken: every claim below carries the command, the `file:line`, or the
documented PostgreSQL 17 behaviour it rests on, and a reader can re-run each one. Where I measured,
I measured on a scratch PostgreSQL 17.11 I created and destroyed myself (§6), never on the server at
`/tmp:5432`. Where the brief was wrong I say so: brief-common's sentence "No PostgreSQL is available
on this machine" is **false** for this run — Homebrew `postgresql@17` 17.11 is installed and I used
it — and I follow the tree and the measurement, not the brief.

What it **does** weaken: framing (A0 chose the threads; a defect it did not think of is one I
probably did not find — §8 lists what I did not check), and shared blind spots (a plausible claim
about Postgres internals is exactly the class A0 and I would get wrong together, which is why the
central claims here are measured rather than reasoned). Pressure from the coordinator is not
evidence in either direction; none was applied in this run.

---

## 1. Verdict on the primary thread, in one sentence

> **The author's premise is TRUE against the tree, and this batch has the SAME S8 shape batch 080
> had — the seven narrowings are `for all to authenticated` and bind no service role — and the
> three closures make the control the narrowings claimed real: measured, a permissive worker policy
> on `app.business_profiles` reads 0 rows and its INSERT is refused by name with the closure present,
> and reads 5 rows across 2 tenants and renames all of them with it dropped.**

Stop-the-line: **no** (§9). The batch closes a gap; it opens none.

---

## 2. The premise, checked against the tree — the thing the brief said was most worth confirming

The S8 map (`evidence/WP-0A-DB-00/a0-pre-080-families-s8-map-2026-09-15.md` §3 row 1) rests on
three claims per family. Each is checked below against the migration text and, in §6, against the
live catalog of a database with `main`'s set applied.

### 2.1 No `S` cell in RFC-2026-022 §3

`architecture/decisions/RFC-2026-022-service-policy-shape.md:173-183` is the table. Nine cells:
audit INSERT (140), research run/source/evidence INSERT (070), publish INSERT (120/121),
notification (051), usage ledger INSERT (061), security event SELECT (140), job claim (050),
raw token/webhook SELECT (110/131), asset hard purge (100/160). **No row names business, page,
industry or knowledge.** The access matrix agrees:

- `docs/sprint-0a/sprint-0a-core-erd-rls-retention-th.md:347-349` — Business/Page SELECT `P`,
  INSERT/UPDATE/archive `P`, immutable version UPDATE/DELETE `N` in the Service column.
- `:355-357` — Knowledge/Research SELECT `P`, Knowledge current INSERT/UPDATE/archive `P`, version
  UPDATE/DELETE `N`.
- Industry assignment has **no row in §8 at all** — `030_industry.sql:47-49` says so in its own
  header.

`db/foundation/lint/service-policy-map.json` carries no entry for any of the seven tables, and the
branch does not change that file (`git diff main...origin/… --stat`). A `P` with no defined
capability is not an `S` (the sentence batches 080, 090 and 132 each gave for classifying nothing),
so **there is no service policy for a closure here to pre-empt.** Confirmed.

### 2.2 `app_worker` holds grants no policy admits

Text: `020_business.sql:452-455` (`select, insert, update` on `business_profiles` and
`page_context_profiles`; `select, insert` on both version tables), `030_industry.sql:485`
(`select, insert, update` on `industry_assignments`), `040_knowledge.sql:529-530`
(`select, insert, update` on `knowledge_items`; `select, insert` on `knowledge_item_versions`),
`041_knowledge_resolution.sql:359` (EXECUTE on `app.knowledge_scope_applies`, a function that reads
no table).

Catalog, `main` applied to the scratch cluster (§6.1, `probe-state-main.txt`), `has_any_column_privilege`
per role over the ten family tables: **`app_worker` and `authenticated` are the only two roles
holding anything**; `anon`, `app_command`, `app_maintenance` hold no `USAGE` on schema `app`
(`has_schema_privilege = f`) and `app_authz` holds `USAGE` (`011:188`) and nothing on any of the
ten tables. Confirmed — with one correction to the map, finding **F1**.

### 2.3 Every permissive policy names `authenticated` only; every narrowing is `for all to authenticated`

Text: the narrowings are `021_member_scope.sql:595-618` (four), `030_industry.sql:596-600` (one),
`040_knowledge.sql:657-672` and `:685-700` (two) — each `as restrictive` / `for all to
authenticated`. Every permissive policy in 020, 021, 030 and 040 is `to authenticated`
(`grep -n 'create policy' -A1` over the four files; forty policies). Batch 102's thirteen restrictive
INSERT policies include five on these tables and are also `to authenticated` (`102_updated_by_is_caller.sql:35-48`).

Catalog (§6.1): **40 policies on the ten tables, every one with `polroles = {authenticated}`**;
no policy on any of them names `PUBLIC` or any other role before this batch. Confirmed.

### 2.4 Therefore

The three families are exactly 080's shape: a RESTRICTIVE narrowing written as though it bounds
every writer, applying to one role, on tables where a service role already holds INSERT and UPDATE.
The only thing between `app_worker` and every tenant's business names today is that nobody has
written the permissive policy — and `RFC-2026-023:14` records that A1-081 measured the consequence
live on batch 081. **The premise holds. The question the Owner has to answer is a decision, not a
fact, and the facts the author put in front of the Owner are correct.**

---

## 3. Tenant isolation and deny-by-default on the seven tables, for every role — reviewed, no open path

Read from the three files and from the catalog with the branch's set applied (§6.2):

- **Shape.** Seven policies, one per table, `as restrictive` / `for all` / no `TO` / both halves
  `current_user = 'authenticated'` — `022:33-55`, `031:33-37`, `042:31-41`. Read back from
  `pg_policy` (§6.2 probe 8): `polpermissive = f`, `polcmd = '*'`, `polroles = {0}` (PUBLIC), both
  halves `(CURRENT_USER = 'authenticated'::name)`, all seven. Textually identical to 082's
  (`082_content_service_path_closed.sql:97-125`) except for names.
- **Both halves.** USING refuses reads and the row-visibility half of UPDATE/DELETE; WITH CHECK
  refuses INSERT and the new-row half of UPDATE. Probe 1 hit the WITH CHECK half by name:
  `new row violates row-level security policy "business_profiles_service_path_closed"`.
- **`current_user`, not a setting.** The predicate reads what `SET ROLE` produced; a service role
  can set any GUC a policy reads (RFC-2026-022 §5/4). Inside a `SECURITY DEFINER` function
  `current_user` is the owner, so a command function running as `app_command` is refused until a
  batch amends the closure with the acting-user arm RFC-2026-023 §3.3 proposes — which is the
  design, not a side effect. Probe 3c measured it: `app_command` given schema `USAGE`, INSERT, and a
  permissive INSERT policy `with check (true)` — the exact shape RFC-2026-017 §6 requires — is
  refused by name; probe 4c, closure dropped, writes a version into tenant A's item.
- **FORCE and ENABLE on all seven**, asserted at `022:168-176`, `031:141-149`, `042:148-156`
  against `relrowsecurity and relforcerowsecurity`; catalog: `t`/`t` on all ten family tables.
- **Owner `postgres`** on all ten (catalog); none owned by `app_command` or `app_authz`, asserted
  at `022:177-186` and siblings.
- **The three repairs RFC-2026-017 §4 forbids** (`RFC-2026-017:62-66`, "the temptation to silence
  it by widening a grant") are not taken: no `grant`, no `alter role`, no owner change in any of the
  three files (`grep -n -iE '^\s*(grant|alter role|alter table .* owner)'` → 0), and the static rule
  refuses them (`identity-isolation.test.mjs:9710-9712` on `main`). `app_command` is
  `rolbypassrls = f` (catalog; `001_service_roles.sql:39`), asserted again at `022:187-189`.
- **`anon`.** No `USAGE` on `app`, nothing granted, nothing admitted (RFC-2026-021 §7/4 stands);
  the closure adds a refusal `anon` never reaches. Probe 6b: `permission denied for schema app`.
- **`app_maintenance`.** Same. A future retention sweep on these families is refused by the closure
  until decided, which 082's header (`:85-87`) calls the intent; the retention owner is batch 160.
- **`app_authz`.** `USAGE` on `app`, no table grant on any of the ten (probe 6b: `permission denied
  for table industry_assignments`). No SECURITY DEFINER function it owns reads a closed table
  (§6.2: `pg_proc` where `prosecdef` and `prosrc ~ '(business_profiles|…|knowledge_item_versions)'`
  → **0 rows**; the five definer functions in `app`/`private` are `is_active_member`,
  `jwt_subject`, `workspace_member_role` (app_authz) and `set_updated_at`, `refuse_mutation`
  (postgres, bypass)). So the closure cannot silently starve a helper the request path depends on.
  Probe 9b: `app.is_active_member(...)` still returns `t` for a fixture owner through the closure.
- **`authenticated` is unchanged.** The predicate is true for it and 020/021/030/040's narrowings
  decide, as before. Probe 7b: a fixture owner reads 4 business profiles, all in its own workspace,
  4 knowledge items, 2 assignments. The suite's 847 pre-existing cases all pass with the closures
  applied (§6.2).
- **Referential integrity is unaffected.** RI checks are documented to bypass row security; the
  composite scope keys from 070/080/090/100 into `business_profiles` and `page_context_profiles`
  keep working for every role, which the branch's 854 green (fixtures for every later family load)
  demonstrates.

**Nothing changed today, measured rather than asserted.** Before: `app_worker` with grant and no
policy reads 0 rows and its INSERT is refused by the unnamed default deny (probe 10:
`new row violates row-level security policy for table "business_profiles"`, no policy name). After:
the same. No existing case moves in either direction (§6.3: exactly the seven new cases fail with the
files removed, 847 others pass either way).

---

## 4. Findings

### F1 — LOW. The S8 map understates the worker's grants, in the dangerous direction

`a0-pre-080-families-s8-map-2026-09-15.md` §2, column "`app_worker` grants today": business/page
"**SELECT** on all four (grants, no policy)"; knowledge "**SELECT** on both". The tree grants
**INSERT and UPDATE** on `business_profiles` and `page_context_profiles` (`020:452-453`), INSERT on
both version tables (`020:454-455`), INSERT and UPDATE on `industry_assignments` (`030:485`),
INSERT and UPDATE on `knowledge_items` and INSERT on `knowledge_item_versions` (`040:529-530`).
The three closure files state this correctly (`022:24`, `031:24`, `042:24`), so the migrations are
right and the memo is wrong.

Why it is a finding and not a typo: the map is the document the Owner is asked to pick a row from.
Read as "SELECT", the exposure a closure removes is a cross-tenant **read** by a worker somebody
later gives a policy. Measured (probe 2), it is a cross-tenant **write**: with the closure dropped and
a permissive worker policy present, `update app.business_profiles set name = 'probe-renamed'`
touched **5 rows in 2 tenants**. The same understatement would price the two rows the Owner still
has to decide — metering and research, where the worker holds INSERT and UPDATE across the family
(`061`, `070`; the map's own rows say so correctly for those two). Owed to A0: one column of one
table, corrected in the map. Not repaired here.

### F2 — LOW. The closure's post-apply guard checks three properties of the policy and not its predicate; nothing refuses a later `alter policy`

The seven catalog cases read back `not polpermissive and polcmd = '*' and polroles = '{0}'`
(`SERVICE_PATH_CLOSURE_ON`, `isolation-cases.mjs:15306-15308` on `main`, shared with 082/083/092/
101's cases). They do **not** read `polqual`/`polwithcheck`. The apply-time block does check the
predicate text (`022:105-111`) — **at 022's own apply time only**. The static rule reads the
predicate — **in the closure files only** (`identity-isolation.test.mjs:9696-9716`), and its
`drop|alter policy` refusal (`:9712`) applies to those files only.

So a later migration `alter policy business_profiles_service_path_closed on app.business_profiles
using (true) with check (true)` would pass the apply-time block (already ran), the static rule
(reads 022, not the new file), and all seven cases (three properties unchanged). No lint in the tree
reads `alter policy` at all (`grep -in 'alter policy' scripts/db/run.mjs tests/ test-kits/` → 0)
and no migration alters a policy today, so the exposure is a diff a reviewer would read, not a
silent path. This is a property of the guard the batch inherits from 082, not one it introduces; it
is recorded here because this batch triples the number of closures the guard covers, and because
"amend the closure" is precisely what RFC-2026-023 §3.3 instructs the next batch to do — the one
statement the guard does not read is the one the design calls for. Owed to A0 (owner of the case
SQL): a predicate read-back in the case, or a rule over every migration that a `_service_path_closed`
policy is only ever altered into the one shape RFC-2026-023 §3.3 names. **This is the first thing the
next reviewer should refuse: an `alter policy … _service_path_closed` whose new predicate is anything
but `current_user = 'authenticated' or (current_user = 'app_command' and app.acting_user_…(…))`.**

### F3 — LOW. The seven cases cite a matrix cell that is wrong for two families and absent for one

All seven carry `covers: ['§12.6/2', '§8.5/service-P-closed']` (branch `isolation-cases.mjs`, hunk
`@@ -12776,6 +12776,90 @@`). 082's cases cite `§8.2/service-P-closed` for content (`:12656`), 092's
`§8.3`, 101's `§8.3` — the section holding the family's `P` cell. Here: business/page's `P` is
**§8.1** (`:347-348`); knowledge's is **§8.2** (`:355-356`); industry assignment has **no §8 row
and no `P`** (`030:47-49`). §8.5 is "Mandatory RLS patterns", which is a defensible tag for the
pattern but not the convention the other four closures set, and `service-P-closed` on
`industry_assignments` names a cell that does not exist. No rule keys on this label
(`identity-isolation.test.mjs:544, 1702, 2316` collect tags; none asserts this one), so nothing
fails. It is coverage-map drift on the day somebody asks "which cases discharge §8.1's Service `P`".
Owed to A0. Not repaired.

### F4 — INFO. A sentence in the author handoff lost its object

`handoffs/WP-0A-DB-00-author-handoff.json` on the branch, `assumptions[0]`: "… app_worker grants
no policy admits, **narrowings .** It is a DRAFT …" — the phrase after "narrowings" (presumably
"`for all to authenticated`") is missing. The manifest blocker and the three headers carry the full
sentence. A0's artifact; recorded, not touched.

### F5 — INFO. What is left open, and whether the reasons hold

- **`industry_packs`, `industry_pack_versions`** (`031:31`) — the reason holds and is stronger than
  written. They carry no narrowing (catalog: zero policies), so there is no S8 claim; and
  RFC-2026-021 §7/3 disposes the catalog's reader to the **server tier**, which is a service role —
  a closure `current_user = 'authenticated'` there would refuse the one reader the approved RFC
  names. `app_worker` holds SELECT and no policy (`030:459-460`), which is the shape RFC-2026-021
  and 030 chose on purpose. Right to leave open.
- **`workspace_member_scopes`** (`022:31`, "an `app_authz` question the map does not ask") — right
  to leave open, for a reason the header does not give: RFC-2026-023 §3.2 (`:40-56`) proposes
  shape B's helpers as SECURITY DEFINER functions **owned by `app_authz`** that read this table;
  inside them `current_user = 'app_authz'`, so a shape-C closure here would refuse shape B's own
  mechanism. The table has no restrictive narrowing (catalog), so it is not S8's shape either. What
  it does keep is the "grant and no policy" shape — `app_worker` holds SELECT and INSERT
  (`021:357`) on the table that *defines* every scope the seven closures protect — and a future
  permissive worker policy there would be caught only by `roleScopedCompleteness` (a policy naming a
  non-request-path role owes a register row, `run.mjs:499`). Adequate today; named so it is not
  forgotten when 023 lands.
- **Metering (061) and research (070)** — not closed; correct, because `usage_events` INSERT and
  the three research INSERTs are CARRIED `S` cells (`RFC-2026-022:176,179`;
  `service-policy-map.json` rows for `usage_events`, `research_runs`, `research_sources`,
  `research_evidence`) and a closure would AND against the policy the RFC expects. **The residual,
  stated plainly so the Owner reads it beside the three closures:** after PR #144 the S8 shape
  remains open on `quota_buckets` and on all four research tables (`RFC-2026-023:14`'s grep list
  minus the families closed), with the worker holding INSERT and UPDATE across research
  (`070`; the map's row is accurate there). That is the map's rows (a)/(b)/(c) and the Owner's
  call; it is not a defect of this batch, which neither opens nor widens it.

### F6 — INFO. `app_command` is four refusals from any row, and the closure is the only one that is a policy

Probe 6b: `app_command` holds no `USAGE` on schema `app` — the first refusal is
`permission denied for schema app`, before any table privilege or policy is consulted. The S8
trigger for the command path therefore needs a schema grant, a table grant, a permissive policy and
then meets the closure. Three of the four are grants a reviewer reads; the closure is what remains
after a reviewer has approved all three, which is the point of it. Nothing to repair; recorded so
nobody reads "the closure changes nothing today" as "the closure is not load-bearing".

---

## 5. Secrets, PII, fixtures, RFC obligations

- **`scan-repository-secrets.mjs` on the extracted branch tree: exit 0.** The three files contain
  DDL and comments only; no fixture is added or changed (`git diff --stat`: no file under
  `tests/db/identity/fixtures/`). No email, phone, token, key or credentialed URL in the three files
  or the seven cases (grep). The Thai text in the headers is quotation of Owner dispositions already
  on `main`.
- **RFC-2026-021.** No view, no client grant, no `anon` grant, no read-allowlist entry owed; the
  batch adds no read surface. (`db/foundation/lint/read-allowlist.json` still does not exist on
  `main`; `identity-isolation.test.mjs:7992-7993` records that as a standing finding. Not this
  batch's.)
- **RFC-2026-022.** The batch classifies nothing and declines correctly: no `S` cell, no map row,
  no service policy. `service-policy-map.json` unchanged. RFC-2026-022 is approved and NOT IN EFFECT
  (§7; the only member of `app_worker` is `postgres`, catalog: `pg_auth_members` on the scratch
  cluster agrees), so no policy the closures could pre-empt exists yet anywhere.
- **RFC-2026-017 §4.** The three forbidden repairs: not taken, asserted, and measured (§3).
- **RFC-2026-023.** Cited as "in review" (`022:15-16`) — correct; its status line says so. The
  closures leave `TO authenticated` narrowings untouched, which is §3.3's precondition.
- **`CONTRIBUTING_AGENTS.md` §"Non-negotiable security and data rules".** Tenant isolation and
  deny-by-default: strengthened (§3). Secret exposure, tenant leakage, migration divergence: none.
  "Never rewrite an integrated migration": honoured — three forward files, 020/021/030/040/041
  untouched (`git diff --stat`). Snapshot tail stays contiguous (`catalog-snapshot.json` and
  `foundation-contract.test.mjs:330-331` on the branch; contract suite 60/60, §6.4).

---

## 6. What I measured, on a scratch PostgreSQL 17.11 at 127.0.0.1:5521

Cluster: `initdb` under my scratchpad, `-c listen_addresses=127.0.0.1 -c unix_socket_directories=''`,
port **5521**, re-initialised between runs (001 creates cluster roles), stopped `-m fast` before
this file was committed. **I never connected to, created anything on, or stopped the server at
`/tmp:5432`.** Commands: `db/foundation/ci/supabase-shim.sql`, then with
`DB_TEST_URL=postgresql://postgres@127.0.0.1:5521/thinkbizthai_test LC_ALL=C TZ=UTC PGTZ=UTC`,
`node scripts/db/run.mjs migrate-clean`, `schema-lint`, `rls-smoke`. The branch's files were read
from a `git archive` of `origin/agent/claude/WP-0A-DB-00-pre-080-closures` extracted into the
scratchpad; no branch file was copied into this worktree and nothing was checked out.

### 6.1 `main` (`4499344`)

`db-migrate-clean: ok` · `db-schema-lint: ok` · **`db-rls-smoke: 847 isolation case(s) passed.`**
Catalog probe (`probe-state.sql`): 40 policies on the ten family tables, all `{authenticated}`;
privilege matrix as §2.2; ENABLE/FORCE `t/t`, owner `postgres`, all ten; role attributes: every
service role `rolbypassrls = f`; 0 SECURITY DEFINER functions reading a closed table.

### 6.2 The branch (`9d5664d`)

`applied 022_…`, `031_…`, `042_…` in tail order · `db-schema-lint: ok` ·
**`db-rls-smoke: 854 isolation case(s) passed.`** = 847 + 7. Catalog diff `main` → branch on the
ten tables: exactly seven rows added, each `f | * | PUBLIC`; nothing else differs (`diff
probe-state-main.txt probe-state-branch.txt`).

Probes, each in a transaction rolled back (`probe-exploit*.sql`; fixtures: 5 business profiles in
2 workspaces, 3 assignments, 5 knowledge items, 5 versions):

| # | as | set-up | closure | result |
|---|---|---|---|---|
| 1 | `app_worker` | permissive `for all … using (true) with check (true)` on `business_profiles` | present | `count(*)` = **0**; `update … set name` = 0 rows; VALUES insert → `new row violates row-level security policy "business_profiles_service_path_closed"` |
| 2 | `app_worker` | same | **dropped** | `count(*)` = **5**, `count(distinct workspace_id)` = **2**; `update` renamed **5 rows across every tenant** |
| 3c | `app_command` | `grant usage on schema app`, `grant insert`, permissive INSERT `with check (true)` on `knowledge_item_versions` (RFC-2026-017 §6's shape) | present | VALUES insert → `new row violates row-level security policy "knowledge_item_versions_service_path_closed"` |
| 4c | `app_command` | same | **dropped** | insert succeeds; `6` versions, `1` written by `app_command` |
| 5 | `app_worker` | permissive on `industry_assignments` | present → dropped | **0** → **3** |
| 6b | `anon`, `app_maintenance`, `app_command` / `app_authz` | none | present | `permission denied for schema app` / `permission denied for table industry_assignments` — grant layer, before any policy |
| 7b | `authenticated` (fixture owner, `request.jwt.claims` set) | none | present | 4 profiles, `bool_and(workspace_id = own)` = **t**; 4 knowledge items; 2 assignments |
| 9b | `authenticated` | `app.is_active_member(own workspace)` — an `app_authz`-owned SECURITY DEFINER helper | present | **t** |
| 10 | `app_worker` | grant and **no** policy (today's shape) | present | 0 rows; VALUES insert → `new row violates row-level security policy for table "business_profiles"` (unnamed default deny — the same refusal the suite's existing service cases see) |

### 6.3 The branch with the three files removed

Re-initialised; the three files moved out of the extracted tree; `migrate-clean` applied
`020, 021, 030, 040, 041` with no `022/031/042`; **`db-rls-smoke: FAILED — 7 of 854 case(s)`**,
exit 1, the seven being exactly `batch-022-closes-the-service-path-on-the-{profile,
profile-version, context, context-version}-table`, `batch-031-…-assignment-table`,
`batch-042-…-{item, item-version}-table`, each with "nothing was visible". **No other case moved in
either direction.** The author's numbers (854; 7 of 854) are reproduced.

### 6.4 Static, on the extracted branch tree

`node --test tests/db/identity/identity-isolation.test.mjs` → **285 / 285 / 0 fail**;
`node --test test-kits/db/foundation-contract.test.mjs` → **60 / 60 / 0 fail**;
`node scripts/scan-repository-secrets.mjs` → **exit 0**. The branch's own `npm run verify`
(643, per its handoff) is not re-runnable from an archive, which has no git; CI run
**34920300638** on `9d5664d` (job `bootstrap`) is **success**, and since Q4(a) `ci.yml:36-54`
checks out the branch by name, that run measures what `npm run verify` on the branch measures.

### 6.5 This branch

`npm run verify` on `agent/claude/WP-0A-DB-00-a1-security-pre-080` (this file the only change from
`main`), verbatim:

```
clean: exit 0 — tests 643, pass 643, fail 0, skipped 0, todo 0
```

**Caveat the reader should keep:** this branch is claimed by no manifest, so the handoff guard
(`test-kits/handoff-conformance.test.mjs`) finds no claimant and returns early — its green here
says nothing about a handoff, and I do not cite it as evidence of one. `npm run check:scope` is not
cited (it takes no arguments and exits 0).

---

## 7. What the next reviewer should refuse

1. **An `alter policy … _service_path_closed` in any later batch whose new predicate is not the
   RFC-2026-023 §3.3 form** — the guard does not read the predicate after apply (F2), so this is
   read by a reviewer or by nobody.
2. **A permissive policy naming `app_worker` or `app_command` on any of the seven tables that
   arrives without the closure amendment beside it.** The closure will refuse it; the cheap way
   out is `drop policy … _service_path_closed`, which the seven cases *do* catch (the read-back
   returns nothing) — and the cheaper way out is repair 1 above, which they do not.
3. **The three RFC-2026-017 §4 repairs** — `BYPASSRLS` on a service role, dropping FORCE, or making
   `app_command`/`app_authz` a table owner — each asserted against at apply time (`022:167-189`)
   and at the role level by `run.mjs`'s `KNOWN_BYPASS`.
4. **Closing `industry_packs`/`industry_pack_versions` in shape C** — it refuses RFC-2026-021 §7/3's
   server-tier reader; **closing `workspace_member_scopes` in shape C** — it refuses RFC-2026-023
   §3.2's `app_authz` helpers (F5).
5. **Closing 061 or 070 without writing the RFC-2026-022 CARRIED amendment in the same file**,
   unless the Owner has picked row (a) or (b) of the map.
6. **Reading the S8 map's "SELECT" as the exposure** (F1). It is INSERT and UPDATE.

---

## 8. What I did NOT review

- **The 847 pre-existing cases** — I ran them (twice green, once with the files removed) and read
  none of them in depth. Hand-simulation is `/claude/q0_sentinel`'s brief.
- **The rest of the branch's diff** — `catalog-snapshot.json`'s `why` paragraph, the contract test's
  `NOT_ON_THE_INSTANCE` list, `branch-identity.test.mjs`'s repoint, `integrity-manifest.json` — I
  read them for scope (nothing outside `writable_paths` but the two amended-without-owning files the
  manifest declares) and did not audit them. The Reviewer's brief.
- **The shim's `service_role`.** `supabase-shim.sql:48-53` creates it *without* BYPASSRLS, stated
  as a deliberate difference from the platform. So the closures' behaviour for `service_role` is
  measured here as a refusal and will be a bypass on Supabase. `service_role` holds no grant in
  `app` under our migrations and `run.mjs:1105` pins it in `KNOWN_BYPASS`; I did not measure it and
  the batch does not touch it.
- **Whether 082's shape is the right answer for families merged before Q3** — that is the Owner's
  question and this file does not answer it. What it says is narrower: the facts the Owner is given
  are true, the control the closures add is real, and the closures change nothing for
  `authenticated` today.
- **RFC-2026-023's threat model** (§4, "stated honestly?") — its reviewer sought is `/claude/a1_bastion`
  and this run is not that review.
- **The FK-index gap, the 550/554 correction, `read-allowlist.json`** — standing blockers on the
  package that this batch neither opens nor closes.

---

## 9. Summary

| # | Severity | Finding |
|---|---|---|
| — | **Premise: TRUE** | No `S` cell (RFC-2026-022 §3 table, matrix §8.1/§8.2, 030's header); `app_worker` holds INSERT/UPDATE grants no policy admits; all 40 policies on the ten tables `TO authenticated`. **This batch has the same S8 shape 080 had**, and the closures make the claimed control real — measured (§6.2). |
| F1 | LOW | The S8 map says "SELECT"; the tree grants INSERT and UPDATE (`020:452-455`, `030:485`, `040:529-530`). Measured consequence: a cross-tenant **write**, 5 rows in 2 tenants. The closure files are right; the memo the Owner reads is not. |
| F2 | LOW | The post-apply guard on every closure (the seven cases + the static rule) does not read the predicate and nothing refuses a later `alter policy`; inherited from 082, tripled here, and it is the exact statement RFC-2026-023 §3.3 asks the next batch to write. |
| F3 | LOW | Cases cite `§8.5/service-P-closed`; the cell is §8.1 (business/page), §8.2 (knowledge), and absent for industry. Convention drift, no rule fails. |
| F4 | INFO | Handoff `assumptions[0]` truncated after "narrowings". |
| F5 | INFO | What is left open is left open for reasons that hold (two of them stronger than the header gives); the S8 shape stays open on 061/070 until the Owner picks a row. |
| F6 | INFO | `app_command` holds no schema `USAGE`; the closure is the fourth refusal and the only one that is a policy. |

**Stop-the-line: NO.** The brief's test — *does a control the repository believes it has fail to
exist?* — fails to bite in both directions. The control this batch adds (every role that is not
`authenticated` refused every row on seven tables, whatever permissive policy it is later given)
exists: read back from the catalog with all three properties and the predicate, refused by name in
four exploit replays, and absent — with exactly the seven cases red and nothing else moving — when
the files are removed. The control the four earlier batches believed they had (narrowings bounding
every writer) was the S8 shape, and that is the premise this batch was built on and this review
confirms. Nothing here widens a grant, changes a role attribute, drops FORCE, or moves an owner.

**Verify line, this branch:** `clean: exit 0 — tests 643, pass 643, fail 0, skipped 0, todo 0`
(§6.5, with the caveat that the handoff guard has no claimant here and is not exercised).

This review is a distinct same-vendor run in the Security/Privacy role, which the Owner's Q1
disposition of 2026-09-15 counts as that role's signature. It is not the Owner's disposition of
PR #144, does not merge anything, and does not move any status field.
