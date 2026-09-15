# A1 Security/Privacy review — the row (b) closure set (batches 062, 071), Draft PR #145

Run: `/claude/a1_bastion_062071`
Role: independent Security/Privacy reviewer, the role `work-packages/WP-0A-DB-00.json`
`role_assignments.security_reviewer_agent_run_id` names, run as a distinct run under the Owner's
Q1 disposition of 2026-09-15 (a same-vendor run in a named role counts as that role's signature;
role separation is not withdrawn).
Subject: `origin/agent/claude/WP-0A-DB-00-closures-062-071`, head `ded29c2`, PR #145 (Draft), two
files `062_metering_service_path_closed.sql` and `071_research_service_path_closed.sql` plus two
cases, two rule rows, the snapshot, contract-list, manifest and handoff edits (twelve files,
`git diff main...origin/… --stat`). Base: `main` = `1a80f43` (merge of PR #144); merge-base
confirmed `1a80f43`. Read with `git show origin/…:<path>`; for the live measurement the branch's
six source files were copied into this worktree and restored with `git checkout --` before this
file was written (§6). The branch was never checked out.
Date: 2026-09-15.

**This document records findings. It advances no package status, signs nothing on any author's
behalf, writes `security_approved` nowhere, and repairs nothing it found.** It is one of the inputs
the Owner reads before merging PR #145; it is not the merge.

---

## 0. What I am, before anything else

**I am a subagent spawned by `/claude/a0_atlas`, the Author of the two files under review, in the
same vendor and model family — the same run that wrote the S8 map this batch is built from, that
transcribed the Owner's row (b) choice, and that will carry this commit into a pull request.** A0
wrote the three brief files I was handed and chose what to point me at: whether it closed exactly
the right tables and nothing else. A0 also told me which brief sentence was false, and it was
(brief-common's "No PostgreSQL is available on this machine" — Homebrew `postgresql@17` 17.11 is
installed and I used it, on a scratch cluster at 127.0.0.1:5531 that I created and destroyed
myself, never the user's server on `/tmp:5432`).

What that does **not** weaken: every claim below carries the command, the `file:line`, or the
documented PostgreSQL 17 behaviour it rests on, and a reader can re-run each one. Where the brief
was wrong or incomplete I say so and follow the tree. What it **does** weaken: framing (A0 chose
the threads; §8 lists what I did not check) and shared blind spots, which is why the central claims
are measured rather than reasoned. No pressure from the coordinator was applied in this run, and
none would be evidence in either direction.

---

## 1. Verdict on the primary thread, in one sentence

> **The author closed exactly the two tables the Owner's row (b) names and no other: `quota_buckets`
> and `research_suggestions` are the only narrowed tables of the two families that are not `S` cells
> in RFC-2026-022 §3, in §8.2/§8.4 themselves, or in `service-policy-map.json`; both closures are
> textually and catalogically 082's shape; measured, a permissive worker policy on either table
> reads 0 rows and its INSERT is refused by name with the closure present, and reads 4 rows in 2
> tenants (buckets) / 2 rows in 2 tenants (suggestions) and writes across both with it dropped.**

Stop-the-line: **no** (§9). The batch closes a gap on two tables; it opens none, and it leaves open
by decision exactly what row (b) says to leave open — plus one table it does not name (F1).

---

## 2. Did the author close the right tables and nothing else — checked against the tree

The Owner's row (b) (`a0-pre-080-families-s8-map-2026-09-15.md` §3, second bullet; the branch adds
the disposition note at its §3 line 23): *close only the narrowed tables that are not `S` cells*.
Three tests, per family, each against source rather than the RFC's summary.

### 2.1 Which tables are narrowed

Catalog with `main` applied (§6.1, `state-main.txt`): thirteen policies on the eight tables of the
two families, every one `polroles = {authenticated}`. The RESTRICTIVE ones are
`quota_buckets_scope_narrows_member` (`061_metering.sql:1046-1051`, `for all to authenticated`)
and, in 070, `research_runs_`/`research_sources_`/`research_evidence_`/
`research_suggestions_scope_narrows_member` (`070_research.sql:1286-1289`, `:1316-1319`,
`:1360-1363`, `:1399-1402`). **`usage_events`, `usage_reservations` and `research_snapshots` carry
no policy at all** — `061:1059-1070` and `070:1336-1348` say so as a decision; the catalog agrees.
So the S8 shape (a narrowing that claims to bound every writer and binds one role) exists on five
tables: one in metering, four in research.

### 2.2 Which of the five are `S` cells

- RFC-2026-022 §3's table (`RFC-2026-022-service-policy-shape.md:173-183`): row `:176` "Research
  run/source/evidence INSERT — 070 — CARRIED"; row `:179` "Usage ledger INSERT (`S/N`) — 061 —
  CARRIED". Neither names a bucket, a suggestion or a snapshot.
- The matrices themselves (`docs/sprint-0a/sprint-0a-core-erd-rls-retention-th.md`): §8.2 `:359`
  "Research run/source/evidence INSERT | N N N N N **S**", `:360` "Suggestion save/dismiss/use |
  Y Y Y P N **P**"; §8.4 `:397` "Usage/quota summary SELECT | Y Y P N N **P**", `:398` "Usage
  ledger INSERT/UPDATE/DELETE | N N N N N **S/N**". The Service column for the two closed tables'
  cells is `P`; the `S` cells are the ledger (`usage_events`) and the run/source/evidence inserts.
- `db/foundation/lint/service-policy-map.json` (unchanged by the branch): rows for `usage_events`,
  `research_runs`, `research_sources`, `research_evidence`; **none for `quota_buckets`,
  `research_suggestions` or `research_snapshots`**, and the evidence row's own text says why:
  "§8 has no row anywhere for inserting a research SNAPSHOT or a research SUGGESTION … Where a
  document is silent the cell is denied". `061:249-255` says the same for the bucket and the
  reservation.

So of the five narrowed tables, three are `S` (the three research inserts) and two are not
(`quota_buckets`, `research_suggestions`). **Row (b) closes exactly those two. Confirmed.** The
three `S`-cell narrowed tables and `usage_events` are named as left open in the headers
(`062:32`, `071:32`); `usage_reservations` is named (`062:32`); `research_snapshots` is not (F1).

### 2.3 The grants and every permissive policy's TO clause on the two closed tables

- `app.quota_buckets`: `authenticated` SELECT, column-scoped (`061:954-956`); `app_worker` SELECT,
  INSERT, UPDATE (`consumed_amount, reserved_amount, computed_through, updated_at`), all
  column-scoped (`061:1000-1007`). Permissive: `quota_buckets_select_owner_or_admin`, `for select to
  authenticated` (`061:1028-1029`). No other role holds anything (catalog, §6.1).
- `app.research_suggestions`: `authenticated` SELECT and UPDATE (`saved_at, dismissed_at, used_at,
  updated_by`) (`070:1155-1158`); `app_worker` SELECT and INSERT (`070:1222-1226`). Permissive:
  `_select_active_member` `for select to authenticated` (`070:1384-1385`), `_update_writer`
  `for update to authenticated` (`070:1391-1392`). No other role holds anything.

Both tables therefore have 101's premise, not 082's: a service role reaches the point where
policies are consulted and is refused there because no permissive policy admits it. The headers
say exactly this (`062:25-30`, `071:25-30`) and assertion 3 asks the true question
(`062:118-137`, `071:118-137`: any permissive policy admitting PUBLIC or a role other than
`authenticated` raises). **Same S8 shape as 080/081/090/100 and the pre-080 three; the answer to the
brief's single most likely finding is yes, and the batch closes it on the two tables it is allowed
to.**

---

## 3. Tenant isolation and deny-by-default on the two tables, for every role — reviewed, no open path

- **Shape.** One policy per table, `as restrictive` / `for all` / no `TO` / both halves
  `current_user = 'authenticated'` — `062:34-38`, `071:34-38`. Read back from `pg_policy` (§6.2,
  P12): `polpermissive = f`, `polcmd = '*'`, `polroles = {0}` (PUBLIC), both halves
  `(CURRENT_USER = 'authenticated'::name)`. Textually identical to 082's
  (`082_content_service_path_closed.sql:97-125`) but for the names, and the static rule holds them
  to it (`identity-isolation.test.mjs:9689-9694` on the branch adds the two rows; the rule at
  `:9701-9747` reads predicate, halves, absence of `TO`, no grant, no `alter role`, no
  `drop|alter policy`, no `member_scope_`, and the apply-time block from code rather than comment).
- **Both halves, measured.** P1/P3: USING refuses the read (0 rows) and the row half of UPDATE
  (`UPDATE 0`); WITH CHECK refuses the INSERT by name: `new row violates row-level security policy
  "quota_buckets_service_path_closed"` / `"research_suggestions_service_path_closed"`.
- **`app_command`.** P5: given schema `USAGE`, table INSERT and a permissive INSERT policy
  `with check (true)` — the exact shape RFC-2026-017 §6 requires of a command writer — it is refused
  by name; P6, closure dropped, the same insert lands (`written_by_probe = 1`). Today `app_command`
  holds no `USAGE` on `app` (P8: `permission denied for schema app`), so the closure is the fourth
  refusal behind three grants a reviewer would read — load-bearing, not decorative.
- **`app_worker`.** The only non-client grantee on both tables. P7 (today's shape, grant and no
  policy): 0 rows, INSERT refused by the unnamed default deny — the refusal the suite's existing
  seven service cases on these tables see (`service-sees-zero-quota-buckets`, … ,
  `service-cannot-propose-a-research-suggestion`), and they do not move with the files present or
  absent (§6.3).
- **`anon`, `app_maintenance`.** No `USAGE` on `app` (catalog; P8). The closure adds a refusal they
  never reach. A future `app_maintenance` sweep on either table is refused until decided, which
  082's header (`:85-87`) names as the intent.
- **`app_authz`.** `USAGE` on `app`, nothing on either table (P8: `permission denied for table
  research_suggestions`). No SECURITY DEFINER function in `app`/`private` names either closed
  table (catalog probe, 0 rows), so the closure cannot starve a helper the request path depends on.
- **`authenticated` is unchanged.** P9: a fixture owner with `request.jwt.claims` set reads 3
  buckets and 1 suggestion, `bool_and(workspace_id = own) = t` on both. The 854 pre-existing cases
  pass with the closures applied (§6.2).
- **FORCE and ENABLE** on all eight family tables, owner `postgres` (catalog, both states);
  asserted at `062:139-148`, `071:139-148`. **The three repairs RFC-2026-017 §4 forbids** are not
  taken: no `grant`, no `alter role`, no owner change in either file (grep; the static rule refuses
  each), `app_command` `rolbypassrls = f` (catalog; asserted `062:159-161`, `071:159-161`); no
  service role holds `rolbypassrls`; `app_worker`'s only member is `postgres` (RFC-2026-022 §7 still
  unmet, so no policy the closures could pre-empt exists yet anywhere).
- **The two apply-time blocks.** Assertion 1 (`:54-87`) reads the closure's four properties from
  `pg_policy`, including both halves and the `current_user`/`authenticated` terms; assertion 2
  (`:89-116`) is 082's general rule; assertion 3 is the true premise (§2.3); assertion 4 the three
  repairs. The `like … escape '\'` line is single-escaped (the 22025 slip the author's §3 records
  is fixed); the dead `service_roles` constant 082/101/022/031/042 carry is gone (C0-pre-080 L3
  applied). Both blocks ran green on the scratch cluster and in CI.
- **Nothing changed today, measured.** Catalog diff `main` → branch on the eight tables: exactly
  two rows added, each `f | * | PUBLIC | (CURRENT_USER = 'authenticated'::name)` on both halves;
  nothing else differs (`diff state-main.txt state-branch.txt`, §6.2).

---

## 4. Findings

Severity: HIGH — a control the repository believes it has does not exist, or a leak; MEDIUM — a
claim a decision rests on is untrue; LOW — imprecision or an omission a reader would act on
wrongly; INFO — record. No finding here is stop-the-line (§9).

### F1 — LOW. 071's header inventories four of 070's five tables; `research_snapshots` is left open without being named, and it is the family's most sensitive row

`071:32` names `research_runs`, `research_sources`, `research_evidence` as left open (`S` cells)
and stops. 070 creates five tables (`070:1093-1106` forces RLS on all five). `app.research_snapshots`
— §9.1 `COPYRIGHT-3`, "approved excerpt only" — carries **no policy and no narrowing**
(`070:1336-1348`, catalog) and `app_worker` holds SELECT, INSERT and UPDATE (`object_ref,
purged_at, updated_at`) on it (`070:1206-1214`). Under row (b) it is correctly **not** closed: it is
not narrowed, so it makes no S8 claim (the same reason `062:32` gives for `usage_reservations`,
which 062 does name). But 071 does not say so, the author's evidence §1 table lists "four tables"
for research, and the manifest's pre-080 blocker text the branch extends says "research (070: four
tables)". Measured (P10): a permissive worker SELECT policy on `research_snapshots` reads **2 rows in
2 tenants** with 071 applied — the "grant and no policy" shape, not S8, guarded only by the
no-policy rule in `identity-isolation.test.mjs` and `roleScopedCompleteness`. Adequate today;
recorded so that the table the family classes as copyrighted material is not the one nobody lists
when the `S`-cell closures land. Owed to A0: one sentence in 071's header and one word in the
blocker. Not repaired here.

### F2 — LOW. The exit both closures name — shape B, the acting-user narrowing for `app_command` — is not the exit for the only non-client role that holds grants on either table

`062:40-42` and `071:40-42` (the policy comments), `062:11-12`, `071:11-12`: refused "until a
batch amends this policy beside a narrowing that binds the acting user (shape B, RFC-2026-023)".
But on both tables the only non-client grantee is `app_worker` (§2.3), and its verbs are the ones
061 and 070 built the grants for: "who is permitted to move the derived one" (`061:995-996`, the
bucket recompute) and "a suggestion is proposed by a run" (`070:305-308`, the run's output).
RFC-2026-023 §3.3 (`:58-71`) adds an `app_command` arm only, says in terms that "`app_worker`,
`app_maintenance`, `anon` and `app_authz` stay refused by the closure", and extends the static rule
"to accept exactly this form and no other". Neither verb has an §8 cell (§2.2: silence is denial),
so neither has a `service-policy-map.json` row, so RFC-2026-022 gives them no policy either.

After 062/071, then, a worker write on either table needs an §8 row (a decision-register change),
a map row, an RFC-2026-022 policy, and an amendment of the closure in a form no RFC yet accepts.
That is the right direction — a decision rather than an omission, the same sentence 082 wrote for
`app_maintenance` — and it is what row (b) chose, but neither file says it, and the exit each names
is for a role that holds nothing here. A reader of 071 would conclude the run's proposals get a
service path when RFC-2026-023 lands; they do not. Owed to A0: one sentence per header naming the
worker's actual exit (an §8 row first), and to the Owner as a fact about row (b): it decides that
the bucket recompute and the suggestion insert have **no** service path until a further decision.
Not a missing control. Not repaired.

### F3 — INFO. A header attribution points at a section that has no rows (same class as C0-pre-080 L4)

`062:7` and `071:7`: "the S8 map … §3, row 2". The map's §3 is a bullet list; the metering and
research **rows** are §2's table (rows 4 and 5), and the option the Owner picked is §3's second
bullet, "(b)". The reader lands in the right file; the pointer is one section off.

### F4 — INFO. Generated outside the repository, and it shows (C0-pre-080 L7 recurs)

Line 25 of each header is one joined line of ~180 characters where the neighbours wrap at ~100;
the generator that double-escaped the `like` pattern (author's evidence §3, an honest record of a
half-applied first run replayed clean) is scratchpad tooling not in the tree, so the next family's
closure will be generated by something nobody can review. The two files themselves are correct.

### F5 — INFO. The pre-080 findings the author says it applied, checked here

- Dead `service_roles` constant (C0-pre-080 L3): gone from both `declare` blocks (`062:48-52`,
  `071:48-52`). Applied.
- `covers` tag (C0-pre-080 L2 / A1-pre-080 F3): `§8.4/service-P-closed` for the bucket
  (`isolation-cases.mjs:12866` on the branch; §8.4 `:397` is the `P`), `§8.2/service-P-closed` for
  the suggestion (`:12879`; §8.2 `:360`). Applied, and right this time.
- Predicate term in the case query (Q0-pre-080 F2 / A1-pre-080 F2): `SERVICE_PATH_CLOSURE_ON`
  (`isolation-cases.mjs:15421` on the branch) reads both halves; pinned by the static rule. P11
  measured it: `alter policy quota_buckets_service_path_closed … using (true) with check (true)`
  and the case query returns **no row**. The 062 case would go red. Applied.
- Case ids avoid the CI control patterns `[a-z0-9-]*quota-bucket` (`ci.yml:509`) and
  `[a-z0-9-]*research-suggestion` (`ci.yml:678`); the rule finds each case by its table parameter
  (`identity-isolation.test.mjs:9742-9743`). Correct.

### F6 — INFO. The residual row (b) leaves, measured so the Owner reads it beside the closures

With 062 and 071 applied, a permissive worker SELECT policy reads, across both tenants:
`usage_events` 2, `research_runs` 5, `research_snapshots` 2 (P10). That is the S8 shape still open
on the three `S`-cell research tables (narrowed, `to authenticated`) and the grant-and-no-policy
shape on `usage_events`, `usage_reservations`, `research_snapshots`. Row (b) intends the first; F1
is about naming the third. `RFC-2026-023:14`'s grep list minus the closed families is now exactly
the three research `S` tables. Not a defect of this batch.

---

## 5. Secrets, PII, fixtures, RFC obligations

- **`node scripts/scan-repository-secrets.mjs` with the branch's six source files in the worktree:
  exit 0.** The two files are DDL and comments only; no fixture is added or changed (`--stat`: no
  file under `tests/db/identity/fixtures/`). No email, phone, token, key, credentialed URL or
  customer content in the two files or the two cases (grep). The Thai text in 082, quoted by
  reference only, is the Owner's disposition already on `main`.
- **RFC-2026-021.** No view, no client grant, no `anon` grant, no read-allowlist entry owed; the
  batch adds no read surface. `061:188-197`'s debt (the bucket SELECT joins the §8.5 list that does
  not exist) is unchanged and not this batch's. `db/foundation/lint/read-allowlist.json` still does
  not exist on `main` — the standing finding, not this batch's.
- **RFC-2026-022.** The batch classifies nothing and declines correctly: no `S` cell on either
  closed table (§2.2), `service-policy-map.json` unchanged, no service policy written. The RFC is
  approved and NOT IN EFFECT (§7; catalog: `app_worker`'s only member is `postgres`). The three
  research `S` cells and the ledger cell keep their map rows and are not pre-empted (§2.2, F6).
- **RFC-2026-017 §4.** The three forbidden repairs: not taken, asserted, measured (§3).
- **RFC-2026-023.** Cited as "in review" (`062:17`, `071:17`) — correct; its status line says so.
  The closures leave the `TO authenticated` narrowings untouched, which §3.3's precondition needs.
  F2 is about what §3.3 does *not* provide for these two tables.
- **`CONTRIBUTING_AGENTS.md` non-negotiables.** Tenant isolation and deny-by-default: strengthened
  on two tables (§3). Secret exposure, tenant leakage, migration divergence: none. "Never rewrite
  an integrated migration": honoured — two forward files, 061 and 070 untouched. Snapshot tail
  stays contiguous (`catalog-snapshot.json`, `foundation-contract.test.mjs:330-333` on the branch;
  contract suite 60/60, §6.4). Migration numbers 062 and 071 are not reserved in §6's registry
  (`sprint-0a-core-erd-rls-retention-th.md:248-279` has no such rows), as `062:23`/`071:23` say;
  071 falls inside `MOD-050`'s `070–079` range (decision register `:154`), which is the same
  family's range and the convention 070 itself was written under ("A0 manifest only").

---

## 6. What I measured, on a scratch PostgreSQL 17.11 at 127.0.0.1:5531

Cluster: `initdb` under my scratchpad (`pg5531/data`), `-U postgres --auth=trust -E UTF8
--locale=C`, started `-c listen_addresses=127.0.0.1 -c unix_socket_directories=''` on port
**5531**, re-initialised between the three runs (001 creates cluster roles), stopped `-m fast`
before this file was written (`lsof` on 5531: closed; the two listeners on 5432 untouched).
**I never connected to, created anything on, or stopped the server at `/tmp:5432`.** Commands:
`db/foundation/ci/supabase-shim.sql`, then with `DB_TEST_URL=postgresql://postgres@127.0.0.1:5531/thinkbizthai_test
LC_ALL=C TZ=UTC PGTZ=UTC`, `node scripts/db/run.mjs migrate-clean`, `schema-lint`, `rls-smoke`
(never `make`). The branch's files were copied into this worktree with `git show origin/…:<path> >
<path>` (062, 071, `isolation-cases.mjs`, `identity-isolation.test.mjs`, `catalog-snapshot.json`,
`foundation-contract.test.mjs`) and restored with `git checkout --` / `rm` before the review
branch was created; `git status` was clean at branch creation.

### 6.1 `main` (`1a80f43`)

`db-migrate-clean: ok` · `db-schema-lint: ok` · **`db-rls-smoke: 854 isolation case(s) passed.`**
Catalog probe (`probe-state.sql` → `state-main.txt`): 13 policies on the eight family tables, all
`{authenticated}`; privilege matrix as §2.3 plus `app_worker` on all eight and `authenticated` on
five; schema `USAGE`: `authenticated`, `app_worker`, `app_authz` only; ENABLE/FORCE `t/t`, owner
`postgres`, all eight; every service role `rolbypassrls = f`; `app_worker`/`app_command`/
`app_maintenance`/`app_authz` each have `postgres` as their only member; 0 SECURITY DEFINER
functions naming a closed table.

### 6.2 The branch (`ded29c2`)

`applied 062_…` after 061, `applied 071_…` after 070 · `db-schema-lint: ok` ·
**`db-rls-smoke: 856 isolation case(s) passed.`** = 854 + 2. Catalog diff `main` → branch:
exactly two rows added, `f | * | PUBLIC | (CURRENT_USER = 'authenticated'::name)` both halves;
nothing else differs.

Probes (`probe-exploit.sql` → `exploit-branch.txt`), each one transaction rolled back; fixtures as
the smoke target left them: 4 buckets / 2 tenants, 2 suggestions / 2 tenants:

| # | as | set-up | closure | result |
|---|---|---|---|---|
| P1 | `app_worker` | permissive `for all … using (true) with check (true)` on `quota_buckets` | present | **0** rows; `UPDATE 0`; INSERT → `new row violates row-level security policy "quota_buckets_service_path_closed"` |
| P2 | `app_worker` | same | **dropped** | **4** rows, **2** tenants; `UPDATE 4` (every tenant's `consumed_amount`); `INSERT 0 1`; 5 rows after |
| P3 | `app_worker` | same on `research_suggestions` | present | **0**; INSERT → refused by name `research_suggestions_service_path_closed` |
| P4 | `app_worker` | same | **dropped** | **2** rows, **2** tenants; `INSERT 0 1`; 3 rows after |
| P5 | `app_command` | `grant usage on schema app`, `grant insert`, permissive INSERT `with check (true)` (RFC-2026-017 §6's shape) | present | refused by name |
| P6 | `app_command` | same | **dropped** | insert lands, `written_by_probe = 1` |
| P7 | `app_worker` | grant and **no** policy (today's shape) | present | 0 rows; INSERT → `new row violates row-level security policy for table "quota_buckets"` (unnamed default deny) |
| P8 | `anon`, `app_maintenance`, `app_command` / `app_authz` | none | present | `permission denied for schema app` ×3 / `permission denied for table research_suggestions` — grant layer, before any policy |
| P9 | `authenticated` (fixture owner, `request.jwt.claims` set) | none | present | 3 buckets, `all_own = t`; 1 suggestion, `all_own = t` |
| P10 | `app_worker` | permissive SELECT on `usage_events`, `research_snapshots`, `research_runs` (no closure there) | — | **2 / 2 / 5** rows, 2 tenants each (F6) |
| P11 | — | `alter policy quota_buckets_service_path_closed … using (true) with check (true)`, then the branch's case query | rewritten | **no row** — the case would fail (F5) |
| P12 | — | the two closures as `pg_policy` renders them | present | `f`, `*`, `{0}`, both halves `(CURRENT_USER = 'authenticated'::name)` |

### 6.3 The branch with the two files removed

Re-initialised; 062 and 071 deleted from the worktree, the branch's cases kept; `migrate-clean`
applied 061 and 070 with no 062/071; **`db-rls-smoke: FAILED — 2 of 856 case(s)`**, exit 1, the two
being exactly `batch-062-closes-the-service-path-on-the-bucket-table` and
`batch-071-closes-the-service-path-on-the-suggestion-table`, each "nothing was visible". **No other
case moved in either direction**, including the seven existing service cases on the two tables.
The author's numbers (856; 2 of 856) are reproduced.

### 6.4 Static, on the branch's files in this worktree

`node --test --test-reporter=tap tests/db/identity/identity-isolation.test.mjs` → **285 / 285 /
0 fail**; `node --test --test-reporter=tap test-kits/db/foundation-contract.test.mjs` → **60 / 60 /
0 fail**; `node scripts/scan-repository-secrets.mjs` → **exit 0**. CI run **34923143406** on
`ded29c2` (job `bootstrap`): **success**; its log reads `applied 062_…`, `applied 071_…`,
`db-migrate-clean: ok`, `db-schema-lint: ok`, `db-rls-smoke: 856 isolation case(s) passed.`,
`tests 643 / pass 643`. Since Q4(a) `ci.yml` checks out the branch by name, so that run measures
what `npm run verify` on the branch measures. Every number the brief said to expect (856; 2 of
856; 643; 285; 60) was read.

### 6.5 This branch

`npm run verify` on `agent/claude/WP-0A-DB-00-a1-security-062-071` (this file the only change
from `main`), verbatim:

```
clean: exit 0 — tests 643, pass 643, fail 0, skipped 0, todo 0
```

**Caveat the reader should keep:** this branch is claimed by no manifest, so the handoff guard
(`test-kits/handoff-conformance.test.mjs`) finds no claimant and returns early — its green here
says nothing about a handoff and I do not cite it as one. `npm run check:scope` is not cited (it
takes no arguments and exits 0).

---

## 7. What the next reviewer should refuse

1. **A permissive policy naming `app_worker` on `quota_buckets` or `research_suggestions` that
   arrives without an §8 row behind it** (F2). The closure refuses it; the cheap way out is
   `drop policy … _service_path_closed` (the two cases catch it — the read-back returns nothing)
   and the cheaper one is `alter policy … using (true)` (P11: the cases catch that too, now). What
   nothing catches is an amendment in a *new* form — a worker arm — which is exactly what these two
   tables will need and RFC-2026-023 §3.3 does not provide; that arm is an RFC, not a diff.
2. **The `S`-cell closures for `usage_events`, `research_runs`, `research_sources`,
   `research_evidence` arriving without the RFC-2026-022 CARRIED policy and the RFC-2026-023
   amendment in the same file**, once both are disposed — the pre-080 blocker's remaining entry.
3. **A closure on `research_snapshots` in shape C** without first deciding who its reader is:
   §9.1's "approved excerpt only" has no approver defined, and the retention purge (batch 160,
   `app_maintenance`) is a service path a closure would refuse (F1).
4. **The three RFC-2026-017 §4 repairs** — `BYPASSRLS` on a service role, dropping FORCE, or making
   `app_command`/`app_authz` a table owner — each asserted against at apply time (`062:139-161`,
   `071:139-161`) and by `run.mjs`'s `KNOWN_BYPASS`.
5. **The next closure file generated by the scratchpad tool without a reviewer diffing it against
   082 by hand** (F4) — the 22025 slip was caught by the database, not by a rule.

---

## 8. What I did NOT review

- **The 854 pre-existing cases** — run three times, read none in depth. Hand-simulation is the
  Tester's brief (`/claude/q0_…_062071`).
- **The rest of the branch's diff** — `catalog-snapshot.json`'s `why` paragraph (word-diff: two
  file names inserted, the paragraph text unchanged), `foundation-contract.test.mjs`'s
  `NOT_ON_THE_INSTANCE` list, `branch-identity.test.mjs`'s repoint, `integrity-manifest.json`, the
  manifest's rationale and blocker edit, the handoff — read for scope (nothing outside
  `writable_paths` but the two amended-without-owning files the manifest declares) and not
  audited. The Reviewer's brief.
- **The seven narrowing predicates** of 061/070 for correctness — they are what the closure ANDs
  against for `authenticated` and are reviewed batches.
- **The shim's `service_role`.** `supabase-shim.sql` creates it without BYPASSRLS as a stated
  difference from the platform; measured here as a refusal, a bypass on Supabase. Holds no grant
  in `app`; pinned in `KNOWN_BYPASS`; not touched by the batch.
- **Whether row (b) was the right row** — the Owner's decision, transcribed by A0 in session and
  not in a separate disposition file; I checked that the decision as stated was applied exactly,
  not that it was the best one. F2 is the one consequence of it I think the Owner should read.
- **RFC-2026-023's threat model** — its reviewer sought is `/claude/a1_bastion`; this run is not
  that review.
- **The FK-index gap, the 550/554 correction, `read-allowlist.json`** — standing blockers this batch
  neither opens nor closes.

---

## 9. Verdict

**Stop-the-line: no.** On no finding. The test from `CONTRIBUTING_AGENTS.md` — does a control the
repository believes it has fail to exist — is answered on both tables in the batch's favour: the
narrowings' claim to bound every writer, false on `quota_buckets` and `research_suggestions` since
061 and 070 merged, is made true by two policies that name nobody and therefore everybody, and the
measurement in §6.2 shows the refusal by name with the closure and the cross-tenant write without
it. No secret, no PII, no tenant leak, no rewrite of an integrated migration, no repair RFC-2026-017
§4 forbids.

What this file signs: that the two closures are 082's shape, that they close exactly the two
tables row (b) names and nothing else, that every `S` cell of both families is left un-pre-empted,
that no role gains a path, and that `authenticated` is unchanged — each measured on PostgreSQL
17.11 and confirmed by CI run 34923143406. What it does **not** sign: the author's handoff, the
manifest, package status, the merge, or that row (b) was the right row. Two LOW findings (F1, F2)
and four INFO are owed to A0 as text, none as a control; the Owner should read F2 as the price of
row (b) stated plainly. The independent Reviewer's and Tester's files are their own.
