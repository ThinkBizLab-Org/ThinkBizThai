# A1 countersignature — DATA-DEC-03 role topology

Run: `/claude/a1_identity` (A1 Identity), co-owner of `DATA-DEC-03` with A0.
Date: 2026-09-06.
Subject: `work-packages/WP-0A-DB-00.json` `open_blockers[1]`.
Against: `db/foundation/migrations/001_service_roles.sql`, `002_service_role_assumption.sql`,
`003_service_role_no_ambient_inherit.sql`, `010_identity.sql`; `db/foundation/ci/supabase-shim.sql`;
`db/foundation/lint/catalog-snapshot.json`; `scripts/db/run.mjs`; `tests/db/identity/**`;
`.github/workflows/ci.yml`; `RFC-2026-016`, `RFC-2026-017`; the provisioned instance
`xtvtflkntpqfvflvdbwk`.

---

## 0. Provenance, stated before the verdict rather than after it

**I am a subagent run spawned by A0, in the same vendor and the same model family
(Anthropic, claude-opus-5).** `RFC-2026-016` §7 already carries this disclosure about the earlier
A1 analysis; it applies unchanged here, and it is not softened by my being asked to act as
co-owner rather than as a helper.

What that does **not** weaken: every catalog fact in §3 below was read by me from `pg_authid`,
`pg_auth_members`, `pg_class`, `pg_policies`, `pg_namespace`, `pg_attribute`, `pg_proc` and
`pg_extension` on the provisioned instance, and every file fact was read from the file. Those are
reproducible by anyone with the same access, from the queries printed below, and none of them
rests on A0's word. Three of them contradict a record A0 wrote.

What it **does** weaken, and materially: this is not an independent second vendor, it does not
satisfy `independence.prefer_cross_vendor_review`, and it does not lift the
`independence.cross_vendor_exception` the manifest already carries. A shared model family shares
blind spots; if A0 and I are wrong about the same thing, nothing here would detect it. A
countersignature from the same family is a **second reading**, not a second opinion. It closes the
co-owner-signature gap `open_blockers[1]` names and it closes nothing else.

I also authored `010_identity.sql`, `tests/db/identity/**` and the three-outcome assertion design
in `db/foundation/test-helpers/rls-assertions.mjs`. Sections of this document assess those files.
**Where I assess my own work I am not an independent reviewer, and §4 says so explicitly rather
than letting the signature blur it.**

---

## 1. Verdict

**COUNTERSIGNED WITH RESERVATIONS.**

Not a clean countersignature: five divergences from what `RFC-2026-016` and `RFC-2026-017`
actually decided are open, and one of them (§5.1) is a control those RFCs made a consequence and
that does not exist in the repository at all.

Not a refusal: the security property `DATA-DEC-03` turns on is **true on the provisioned instance
today**, and I measured it myself rather than accepting it. The topology as built matches
`RFC-2026-017` §3's table role-for-role and attribute-for-attribute. Refusal would have to rest on
a defect in the topology, and I did not find one — the defects I found are in the *record around*
the topology, in the lint that is supposed to hold it, and in a test fixture that cannot run
against the platform it describes.

---

## 2. Exactly what is being signed

I sign the following claim, and nothing wider:

> On the provisioned Supabase instance `xtvtflkntpqfvflvdbwk` at 2026-09-06, with migrations
> `000`, `001`, `002`, `003`, `010` applied (migration-set digest `d12d504b8cdece01`):
>
> 1. The roles `app_worker`, `app_command` and `app_maintenance` exist and each holds
>    `rolbypassrls = false`, `rolsuper = false`, `rolcanlogin = false`, `rolinherit = false`, and
>    no password in `pg_authid`.
> 2. None of the three is a member of any role. There is therefore no membership path by which any
>    of them could reach a role that bypasses RLS, and role attributes are not inherited through
>    membership in any case.
> 3. The set of roles on the instance holding `rolbypassrls OR rolsuper` is exactly
>    `{postgres, service_role, supabase_admin, supabase_etl_admin, supabase_read_only_user}` —
>    the five the platform ships, with no sixth, and with none of the three roles this decision
>    created among them.
> 4. `postgres` can assume all three by explicit `SET ROLE` (`set_option` true on one of the two
>    membership rows) and inherits none of them ambiently (`inherit_option` false on **both** rows).
>    This is the state `003` claims and `002` failed to reach.
> 5. All five `app` tables carry `relrowsecurity = true` **and** `relforcerowsecurity = true`, are
>    owned by `postgres`, and carry ten policies between them, every one of them `TO {authenticated}`.
>    No policy on any `app` table names `app_worker`, `app_command` or `app_maintenance`.
> 6. `anon` holds no privilege of any kind on schema `app` or on any object in it. `app_worker`
>    holds `USAGE` on `app` and table/column privileges on all five tables while holding no policy —
>    the deliberate arrangement that makes a service-path refusal attributable to RLS.
>
> Taken together: `RFC-2026-016` §4's four closeable propositions — force unconditionally, retire
> "force where compatible", no application or worker role holds `BYPASSRLS`, a bypass is a policy
> on a named role and never a role attribute — hold **as built**, on this instance, on this date.

That is the whole of the claim. It is a statement about catalog state, not about production
behaviour; §4 draws that line.

---

## 3. What I verified myself, and how

### 3.1 By query against the provisioned instance (Supabase MCP, read-only; no DDL, no writes, no role changes)

| # | query | result | bears on |
|---|---|---|---|
| Q1 | `select rolname, rolsuper, rolbypassrls, rolcanlogin, rolinherit, (rolpassword is not null) from pg_authid where rolname in (...)` | `app_worker` / `app_command` / `app_maintenance`: all four flags false, no password. `postgres` bypassrls **true**, super false. `service_role` bypassrls **true**. `supabase_admin` super+bypass. | claim 1; RFC-2026-017 §2's measurement independently reproduced |
| Q2 | `select ... from pg_auth_members am join pg_authid ... where roleid or member in (app_*)` | Six rows, two per role, **all** `inherit_option f`; per role one `admin t/set f` (grantor `supabase_admin`, the PG16 `CREATE ROLE` implicit grant) and one `admin f/set t` (grantor `postgres`, batch 003). **No row anywhere has an `app_*` role as `member`.** | claims 2 and 4 |
| Q3 | `select rolname from pg_authid where rolbypassrls or rolsuper` | exactly the five in `run.mjs:214`'s `KNOWN_BYPASS`; no sixth | claim 3 |
| Q4 | `select relname, pg_get_userbyid(relowner), relrowsecurity, relforcerowsecurity, (policy count) from pg_class where relnamespace='app'::regnamespace and relkind='r'` | 5/5 enabled **and** forced; owner `postgres`; 2/3/1/2/2 policies | claim 5 |
| Q5 | `select schemaname, tablename, policyname, roles, cmd from pg_policies where schemaname='app'` | ten policies, `roles = {authenticated}` on every one; no `app_*` role appears | claim 5 |
| Q6 | `select nspname, nspacl from pg_namespace where nspname in ('app','private','public','extensions')` | `app` = `{postgres=UC, authenticated=U, app_worker=U}` — **no `anon`, no PUBLIC**. `private` = `{postgres=UC}` only. | claim 6; batch 000's revokes hold |
| Q7 | `select relname, relacl from pg_class ...` + `select relname, attname, attacl from pg_attribute where attacl is not null` | `app_worker` holds table-level `arw` on `workspaces` / `workspace_settings` / `workspace_members` and `r` on `user_profiles`; column grants to `authenticated` match `010` exactly; `token_hash` is `a` (insert) for both and never `r` | claim 6; and the premise the §7 assertion rests on |
| Q8 | `select extname, nspname from pg_extension join pg_namespace` | `pgcrypto` is in **`extensions`**, not `public` | defect 5.4 |
| Q9 | `select nspname, proname from pg_proc join pg_namespace where proname in ('digest','gen_random_uuid')` | `extensions.digest` (×2 signatures), `extensions.gen_random_uuid`, `pg_catalog.gen_random_uuid`. **`public.digest` does not exist.** | defect 5.5 |
| Q10 | `select ... from pg_auth_members where member in ('authenticator','authenticated','anon','service_role','postgres')` | `authenticator` holds `set_option = true` on `anon`, `authenticated` **and `service_role`** — and on nothing else. It is **not** a member of `app_worker`, `app_command` or `app_maintenance`. | §4.3, the reservation that matters most |

### 3.2 By reading the repository

- Migration-set digest recomputed with the same algorithm as `scripts/db/run.mjs:129-134`:
  `d12d504b8cdece01`, equal to `catalog-snapshot.json`'s `taken_against_migrations`. The staleness
  guard at `run.mjs:145` is therefore not currently masking anything, and the snapshot describes
  the migration set now in the tree.
- Every field of `catalog-snapshot.json`'s `service_roles` and `tenant_tables` blocks
  re-measured by Q1/Q2/Q4 and found **accurate**, including `has_password: false` (which `pg_roles`
  would have reported as true — the note in the snapshot header is correct and the measurement
  behind it was taken the right way).
- `tests/db/identity/isolation-cases.mjs` enumerates **28** cases (5 `rows`, 7 `no-rows`, 7
  `no-effect`, 9 `denied`), counted by executing `buildCases()` with a stub resolver.
- The negative control's arithmetic checks out. Disabling RLS on `app.workspaces` alone
  (`ci.yml:143-144`) leaves exactly ten cases unable to pass: `owner-a-cannot-see-workspace-b`,
  `owner-a-cannot-update-workspace-b`, `viewer-a-cannot-update-workspace-a`,
  `approver-a-cannot-update-workspace-a`, `editor-a-cannot-update-workspace-a`,
  `suspended-a-sees-zero-tenant-rows`, `suspended-a-cannot-mutate`, and all three service cases
  that touch `app.workspaces`. **10 of 28**, as `open_blockers[2]` states. The eighteen that
  survive survive for reasons I can name (a different table, or a privilege-layer refusal that
  disabling RLS does not restore), so the control is measuring what it claims to measure.

### 3.3 What I take on trust, and cannot discharge

- **That CI is green, and that it ran what `ci.yml` says.** I did not execute a CI round and this
  host has no `psql`, `pg_ctl` or `docker` (`open_blockers[0]`). I read the workflow; I did not
  watch it run. Every statement below about "CI proves X" is conditional on the run having
  happened as written.
- **That the instance state I measured is the state `000`–`010` produced**, rather than a state
  reached partly by hand. The snapshot's digest binding makes silent drift harder, not impossible;
  nothing in the repository records an apply transcript I could reconcile against.
- **That `002` was ever applied in the state `003`'s comment describes.** `003:14-15` reports a
  post-`002` reading of `inherit_option t` on the granted row. I cannot re-observe a state that
  `003` has since corrected. I can say the claim is *mechanically credible* — PostgreSQL 16+ takes
  an omitted `INHERIT` from the **member** role's `rolinherit`, and `postgres` has `rolinherit = true`
  (Q1) — and that the end state `003` aimed at is the end state the catalog is in (Q2). That is
  corroboration, not reproduction.
- **The `§8.1` matrix reading.** I read
  `docs/sprint-0a/sprint-0a-core-erd-rls-retention-th.md:337-347` directly and confirm the Service
  column there is `P` on every identity/workspace row and `N` only on
  "Immutable business/page version UPDATE/DELETE" — a batch 020 table. That is my reading of a
  Thai-language specification; it is load-bearing for §4.2 and a Thai-first reviewer should
  confirm it.

---

## 4. What this signature does NOT cover

### 4.1 It does not cover the platform, and CI cannot make it

State this plainly because the blocker text invites the opposite reading:

**A green CI run proves that our policies still behave the way they behaved. It proves nothing
whatsoever about Supabase.** `db/foundation/ci/supabase-shim.sql:37-39` creates `service_role`
**without** `BYPASSRLS`; on the platform it ships **with** it (Q1). The shim says so in its own
header, and it is the safe direction for a regression suite — but it means the single measurement
that decided `DATA-DEC-03` has no CI equivalent and never will.

More precisely, the green run establishes:

- **Does** prove: the ten policies in `010`, evaluated by a Postgres 17 of the same major version,
  admit and refuse exactly the identities the 28 cases name; and that the suite is capable of going
  red, because the negative control forces it to.
- **Does not** prove: that `app_worker` lacks `BYPASSRLS` on Supabase (in CI it lacks it because
  `001` created it that way in a container where nothing else would have granted it); that
  `service_role` and `postgres` bypass (in CI they do not, so the entire hazard the decision exists
  to address is absent from the environment); that PostgREST, the pooler, or the Supabase auth
  path assume roles the way `private.as_user` does; or that any of this survives a platform
  upgrade.

The BYPASSRLS facts in claims 1–3 of §2 rest on **my queries in §3.1, not on CI.** They are a
measurement with a date on it, and a measurement decays. The lint at `run.mjs:191-216` reads a
committed JSON snapshot, so `db-schema-lint` in CI re-checks the *snapshot's* internal consistency
against the migration digest — it does **not** connect to Supabase and does not re-measure. Nothing
in this repository will notice if the platform grants `app_worker` `BYPASSRLS` tomorrow. Re-taking
the snapshot is a manual act with no scheduled owner.

### 4.2 It does not cover `RFC-2026-017` §7 as §7 is written

The blocker as put to me says the §7 assertion "now exists as the case
`service-identity-cannot-change-a-tenant-row`". **That case does not discharge §7, and it is not
the case that does.**

`isolation-cases.mjs:446-456` declares `expect: 'no-effect'` — an empty result plus a witness read.
§7 asks for the service identity to be *"**denied with an error, not an empty result**"*. An empty
result is precisely the outcome §7 rules out. The `no-effect` assertion is strictly stronger than
`expectNoRows` (the witness half is real work), but it is strictly weaker than what §7 demands, and
naming it as the discharge would be the substitution the whole helper module exists to prevent.

The case that actually carries §7's shape is
**`service-identity-is-denied-a-write-with-an-error`** (`isolation-cases.mjs:432-445`): an INSERT,
`expect: 'denied'`, requiring SQLSTATE `42501` through `expectDenied`, which checks the code
(`rls-assertions.mjs:44,70-87`) and refuses to accept an empty result. The repository's own static
test already knows this — `tests/db/identity/identity-isolation.test.mjs:125-140` requires at least
one `RFC-2026-017§7` case with `expect === 'denied'` **and** asserts that it must be an INSERT,
for exactly the reason above. So the mis-citation is in the request handed to me; it is not in a
committed artefact. I checked: neither case name appears anywhere in the repository outside
`isolation-cases.mjs` itself. **I record the correction rather than the accusation.**

Even with the right case named, §7 is discharged only in an **analogous** form, and I want that on
the record because I wrote the analogy:

- §7 asks for "an operation the matrix marks `N` for service". **`§8.1` marks no operation `N` for
  service on any batch 010 table** — every service cell there is `P`, and the single `N` belongs to
  immutable business/page versions, which are batch 020's. So §7's literal assertion is not
  executable against batch 010 and is owed by 020.
- What `service-identity-is-denied-a-write-with-an-error` actually asserts is: a service identity
  **holding the INSERT privilege** and holding **no policy** is refused with `42501` on a forced
  table. That is a true and load-bearing regression control — a role that had acquired `BYPASSRLS`
  would succeed — but it is denial-by-absence-of-policy, not denial-against-a-matrix-`N`.
- The **positive** half is wholly untested and cannot be tested here: whether a service path that
  *does* hold a policy is still confined by it. That is what the `S` operations in §8.2–§8.4 are
  for, and they live in batches 050, 061, 070, 120, 140.

I therefore **do not** countersign the sentence "`Isolation remains unproven until the negative
assertion in §7 exists`" as satisfied. What exists is the nearest assertion batch 010's tables can
carry. `SMOKE_COVERAGE[8]` in `isolation-cases.mjs:77-81` already labels it `'negative-half'`, and
that label is the honest one.

### 4.3 It does not cover the production service path, because there isn't one

This is the reservation I weight highest, and it is the one that most needs saying out loud.

`RFC-2026-017`'s status line reads, in the present tense: *"the service path runs under app_worker,
app_command and app_maintenance"*. **On the provisioned instance, nothing can run under them
except `postgres`.** Q10: `authenticator` — the login role every PostgREST and supabase-js request
arrives on — holds `set_option = true` on `anon`, `authenticated` and `service_role`, and holds no
membership at all in the three roles this decision created. The only role that can `SET ROLE
app_worker` is `postgres`, which bypasses RLS anyway.

Two consequences, and they point in opposite directions:

1. The non-bypassing topology is **created but not connected**. It is reachable from a migration
   session and from the test harness, and from nowhere else.
2. The bypassing path is **still fully reachable**. `authenticator → SET ROLE service_role` is one
   statement away and is exactly what supabase-js with the service-role key does. `RFC-2026-017` §3
   says `service_role` and `postgres` are "reserved for migration and platform administration" and
   that "neither is used by application or worker code" — that is a statement about code that does
   not exist yet, and **nothing in the database enforces it**.

This is disclosed, not hidden: `001_service_roles.sql:22-25` states that granting membership to
`authenticator` would pick the connection method and declines to; the manifest's
`required_human_authorities` records the service-path choice as owed to the Product Owner and A0
before G1. I am not calling it a defect. I am fixing the boundary of my signature on it:

**I countersign that the roles are correct. I do not countersign that the service path is safe,
because no service path exists yet, and the identity production would reach for today is the one
that bypasses.** When `WP-0A-*` grants `authenticator` membership in `app_worker` — or resolves
this some other way — that change is a new security surface and needs its own review. It is not
covered here.

### 4.4 It does not cover my own work as an independent review

`010_identity.sql`, `tests/db/identity/**` and `rls-assertions.mjs` are mine. §4.2's analysis of
what the §7 case does and does not prove is me marking my own homework, and it should be read that
way even though it is unfavourable to my own artefact. The consistency finding in §5 — that `010`'s
policies match the topology `001`–`003` builds — is likewise self-assessment. The independent
reviewer (`/claude/c0_contract_reviewer`) and tester (`/claude/q0_sentinel`) roles are unaffected by
this document and are not discharged by it.

### 4.5 It does not cover anything I could not reach

I reached the instance and every file listed at the head of this document. I did **not** run
`npm run check`, `make db-verify`, or any CI job, and I regenerated nothing. Where a claim depends
on an execution I did not perform, §3.3 says so.

---

## 5. Defects found

Ordered by consequence, not by size. Every one has a file and a line.

### 5.1 The exemption register `RFC-2026-016` §4 makes load-bearing does not exist

`RFC-2026-016` §4 retires "force where compatible" and replaces it with *"a declared exemption
register — role × table × operation × reason × owner × review date — that the schema lint reads
**in both directions**, so neither a bypass without a row nor a row without a matching catalog
state can pass."*

**No such register exists anywhere in the repository, and no lint reads one.** A repository-wide
search for `exemption` returns only unrelated matches under `evidence/` (secret-scan prose
carve-outs from `WP-0A-A0-003` and `WP-0A-CON-008`). `scripts/db/run.mjs` has no code path that
opens such a file.

This is the most consequential finding because of *what it was replacing*. "Force where compatible"
was retired for being unfalsifiable; today the register that was supposed to make it falsifiable
also does not exist, so the condition is unfalsifiable again — by absence rather than by wording.
Nothing bites yet, because there are no exemptions to declare. The defect is that when the first
one arrives (`app_maintenance`'s `USING (true)` cross-tenant policies, per `RFC-2026-017` §3, are
the obvious first) there is no place to declare it and no rule that would notice it was not
declared.

**Owner:** A0 / DB-00 (`scripts/db/**` and `db/foundation/**` are DB-00's). Owed before the first
`app_maintenance` policy, which is batch 160.

### 5.2 The catalog lint implements half of the check `RFC-2026-016` §6 specifies

`RFC-2026-016` §6: *"plus a `pg_roles` check that no reachable application or worker role holds
`rolbypassrls` **or `rolsuper`**."*

`scripts/db/run.mjs:200` checks `r.bypassrls` on the three service roles. **`rolsuper` is checked
nowhere in the file** — the string does not appear, and no property named `super` is read. The
`catalog.service_roles` entries in `db/foundation/lint/catalog-snapshot.json` do not carry a
`super` field at all, so the data to check it was never captured for those roles.

Worse in a quiet way: the snapshot's `catalog.login_roles` block **does** carry `super` for nine
platform roles, and `catalogLint` never reads `login_roles` in any form. It is committed data that
no rule consumes — the shape of evidence that looks like a control and is not.

Not currently exploitable: Q1 confirms all three roles have `rolsuper = false`, and a superuser
would also appear in `roles_bypassing_rls` and trip the `KNOWN_BYPASS` rule at `run.mjs:214-216`.
But that is a coincidence of `superuser ⇒ bypasses`, not the check §6 asked for, and it would not
survive someone narrowing the bypass list.

### 5.3 `RFC-2026-016` §2 and §6 require the policy shape in batch `000`; it is not there, and no RFC amended that

`RFC-2026-016` §2: *"it must land **in batch `000`**"*, with a paragraph of reasoning about
migration invariant 1 and batches `010`–`180` inheriting the shape. §6, first consequence:
*"Batch `000` carries the service-role policy shape, so later batches inherit a correct one."*

`db/foundation/migrations/000_foundation.sql` creates schemas, one extension and one trigger
helper. It creates no table, enables no RLS and writes no policy — as `000:9-16` itself explains,
because at the time it was written `RFC-2026-016` was still Proposed. `RFC-2026-017` §6 later says
the topology *"belongs in batch `000` **or an early batch A0 owns**"*, which `001` satisfies; but
§6 of **016** was never amended, and the divergence between "must land in 000" and "landed in
001–003, and the policy shape landed in 010" is not recorded in either RFC.

Compounding it, `000_foundation.sql:12` still reads *"RFC-2026-016 is Proposed"*. It has been
**Approved** since 2026-09-05. Migration invariant 1 forbids rewriting `000`, so the stale sentence
must stay — which is precisely why an errata note somewhere a reader will find it is owed.

### 5.4 Batch `000`'s `pgcrypto` record is still wrong, and the batch `004` that was supposed to correct it does not exist

`010_identity.sql:14` states: *"Batch 004 corrects the record."*

**There is no `004_*.sql`.** `db/foundation/migrations/` contains `000`, `001`, `002`, `003`, `010`
and nothing else, and a repository-wide search finds no other reference to a batch 004.

The record it was to correct is still uncorrected, and I re-measured both halves of it:

- `000_foundation.sql:24` — `create extension if not exists pgcrypto with schema public`. Q8:
  `pgcrypto` is installed in **`extensions`**. The `if not exists` made this a silent no-op; the
  comment's `with schema public` describes a schema placement that never happened.
- `000_foundation.sql:21` — *"`pgcrypto` is required for `gen_random_uuid()`"*. Q9:
  `pg_catalog.gen_random_uuid` exists independently. It has been in core since PostgreSQL 13.

This is the record that propagated into my own `010`, cost an `ERROR 42883` on first apply, and was
patched at the call site rather than at the source. The promised correction was then written into a
comment as though it had happened. **A forward-fix promised in a merged file and never written is
the same defect class as the wrong record it was promising to fix** — and this repository's
evidence file for this very work package (`tenant-isolation-2026-09-05.md`, "Defects this run
found", item 1) already lists it as found.

### 5.5 The identity fixture and the isolation suite call `public.digest()`, which does not exist on the platform

The same defect as 5.4, in files that were not corrected when `010` was:

- `tests/db/identity/isolation-cases.mjs:143` — `public.digest($2, 'sha256')` in the shared
  `invite(...)` builder, used by four cases.
- `tests/db/identity/fixtures/010-identity-fixture.sql:72` and `:76` — `public.digest(...)` in the
  invitation rows.

Q9: **`public.digest` does not exist on `xtvtflkntpqfvflvdbwk`.** Only `extensions.digest` does, and
`extensions` is on the instance's `search_path` while a `public.` qualifier is not a search-path
question at all.

It passes in CI because CI is a bare `postgres:17` where `000`'s `create extension ... with schema
public` **does** install pgcrypto into `public` — the one environment where batch 000's incorrect
record happens to be true. So:

- On the platform, the fixture would fail to load outright, and the four `invite(...)` cases would
  raise `42883`. `expectDenied` checks the code (`rls-assertions.mjs:44`) and would reject `42883`
  as "not an RLS refusal", so this fails loudly rather than passing falsely — the three-outcome
  design holds. But **the suite as committed cannot be run against the instance it was written to
  protect**, which is a real limit on `open_blockers[2]`'s "measured once against a provisioned
  Supabase instance": that measurement used hand-written SQL through MCP, not this suite.
- The correct form is unqualified `digest(...)` resolving through `extensions` on the platform —
  which would *not* resolve in the CI container, where pgcrypto lands in `public`. So this needs a
  decision about where pgcrypto lives, not a one-line edit. **That decision is A0's**: it is batch
  000's record and `db/foundation/ci/`'s shim.

I own `tests/db/identity/**`. This is my defect to have shipped and it is A0's record that caused
it; both halves belong in the finding.

### 5.6 `deniedBy` is declared on four cases and asserted by nothing

`tests/db/identity/isolation-cases.mjs:218, 279, 368, 382` each carry `deniedBy: 'grant'`, and
`:282` explains that it "records the layer". A repository-wide search shows the key is read by
**no** code: not `run-isolation.mjs`, not `rls-smoke.mjs`, not `identity-isolation.test.mjs`.

It is documentation wearing the shape of an assertion. It matters here specifically because §7's
entire point is *which layer* refused: the suite has no mechanism that would notice if
`service-identity-is-denied-a-write-with-an-error` began being refused by the privilege system
instead of by RLS.

Partly mitigated, and I record the mitigation because it is real:
`identity-isolation.test.mjs:142-155` asserts against the migration **text** that
`grant select, insert, update on app.workspaces to app_worker` is present and that no policy names
any service role — so the premise is pinned in the one place migration invariant 1 makes stable.
Q7 confirms the grant is live (`app_worker=arw/postgres`). The gap is that a *later* batch could
revoke it and the suite would keep passing while silently testing nothing. Mine to fix.

### 5.7 `002`'s `alter role ... noinherit` statements were no-ops twice over

`003` correctly identifies that `002:41-43` used the wrong switch. It is worth recording that the
statements were inert for a **second** reason `003` does not mention:
`001_service_roles.sql:30,39,48` already created all three roles `noinherit`, so
`alter role app_worker noinherit` changed nothing even about the property it does control. And
`002:38-40`'s comment — *"INHERIT off is the default for these grants under `noinherit` roles"* —
inverts the actual rule: PostgreSQL 16+ takes an omitted `INHERIT` from the **member** role's
`rolinherit`, and the member here is `postgres`, which has `rolinherit = true` (Q1). The role's own
`noinherit` was never going to affect the grant.

No live consequence — `003` reached the intended end state and Q2 confirms it — and `003`'s
account of the mechanism is correct. Recorded because `002`'s comment is still in a merged file
asserting a rule that is wrong, and the next person to reason from it will reason wrongly.

### 5.8 Minor: the snapshot's `service_roles[].memberships: 0` is ambiguous

`db/foundation/lint/catalog-snapshot.json` records `memberships: 0` for each service role. Q2 shows
**six** `pg_auth_members` rows involving them (two per role, `postgres` as member). The field is
evidently counting memberships *held by* the role rather than *in* it — which is the security-
relevant direction and is correct as intended — but the field name says neither, and no lint rule
reads it. Rename or drop.

---

## 6. Answers to the five questions put to me, in one place

1. **Does the topology as BUILT match `RFC-2026-016` and `RFC-2026-017`?** The *roles* match
   exactly — Q1/Q2/Q3 against `RFC-2026-017` §3's table, three for three on every attribute.
   Three divergences from the decisions as written: the exemption register `016` §4 promises does
   not exist (5.1); the lint implements `rolbypassrls` but not the `rolsuper` half of `016` §6
   (5.2); and `016` §2/§6's "must land in batch 000" was satisfied by batches 001–003 and 010
   instead, with no amending RFC (5.3).

2. **Is the membership state what the record claims (`inherit_option f, set_option t`)?**
   Effectively yes; literally, the record is imprecise about a two-row state. Q2: there are **two**
   membership rows per role, not one. The `CREATE ROLE` grant (grantor `supabase_admin`) is
   `admin t / set f / inherit f`; the batch-003 grant (grantor `postgres`) is
   `admin f / set t / inherit f`. Aggregate: `postgres` can `SET ROLE`, inherits nothing, holds
   admin. That is the intended state and it is the state the database is in. `003` is a correct
   forward fix. `002`'s comment is wrong in the way `003` says and in one further way (5.7).

3. **Does the §7 assertion discharge §7?** No — and the case named in the blocker is the wrong one.
   `service-identity-cannot-change-a-tenant-row` is `expect: 'no-effect'`, an empty result, which is
   the outcome §7 explicitly excludes. `service-identity-is-denied-a-write-with-an-error` is the
   case that demands `42501`, and the repository's own test at
   `identity-isolation.test.mjs:125-140` already enforces that. Even that case is **narrower than
   §7**: §8.1 marks no operation `N` for service on any batch 010 table, so what is asserted is
   denial-by-absence-of-policy, not denial-against-a-matrix-`N`. §4.2 has the full reasoning.

4. **What does the green CI run prove about the service path?** That the policies still behave as
   written, against roles the shim created, in a container where `service_role` does **not** bypass
   RLS and therefore where the hazard `DATA-DEC-03` exists to address is absent. It proves nothing
   about Supabase. The BYPASSRLS facts rest on my §3.1 queries and on nothing in CI. §4.1 has the
   full ledger.

5. **Would anything in the topology make the isolation claim FALSE on a provisioned instance?**
   No. On the contrary, Q1/Q2/Q4/Q5/Q6/Q7 confirm it true as measured. But it is true of a role no
   production connection can currently assume: `authenticator` holds `SET` on `service_role` (which
   bypasses) and holds no membership in `app_worker` (Q10). The isolation claim is therefore not
   *false* — it is *not yet load-bearing*. §4.3.

---

## 7. Disposition

`open_blockers[1]` — "A1's countersignature on the role topology is outstanding" — is **discharged
with the reservations in §4 and the seven defects in §5 recorded as open.** `DATA-DEC-03` may close
on `RFC-2026-016` §4 as far as §2 of this document states, and no further.

I make no claim about the other three blockers, and this document changes no manifest, RFC,
migration, registry or handoff.

Signed: `/claude/a1_identity`, co-owner of `DATA-DEC-03`, 2026-09-06 — a same-vendor,
same-model-family subagent run spawned by A0, per §0.
