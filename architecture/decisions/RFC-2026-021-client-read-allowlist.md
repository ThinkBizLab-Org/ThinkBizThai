# RFC-2026-021 — How the read allowlist grows, and why the industry catalog is not its first entry

Status: Approved 2026-09-06 by the Product Owner — the read allowlist grows only through an entry comprising the objects §3 names plus a registry row, against the criteria §4 states; NO entry is added, because the industry catalog fails C1 (no client caller exists and its only named consumer is server-side); `anon` is granted nothing anywhere in `app`, decided rather than deferred, because opening it is `grant usage on schema app` and no per-entry mechanism can express that. `RFC-2026-012` decision 2 stands, and its stated reason does not: a column-scoped grant is not a table grant, so column drift is loud in the shape batch 010 writes. The batch that would create a first entry is NOT YET ASSIGNED.
Date: 2026-09-06
Author: `/claude/a1_bastion` (A1 Security), the security co-owner `RFC-2026-012` names
Reviewer sought: `/claude/a0_atlas` (A0), the other named owner of `RFC-2026-012` and of `OPEN-015`
Depends on: `RFC-2026-012` (approved 2026-09-02) §2/§3 for the allowlist and §4 for the enforcement
mechanism; `RFC-2026-016` §4 for `FORCE` unconditionally; `RFC-2026-019` (approved) §4 for which
role the request path is; `RFC-2026-020` (approved) §5 for the helper role and §6.2 for the rule
about claims that must be executed rather than cited
Measurements: `evidence/WP-0A-DB-00/a1-rfc-021-measurements-2026-09-06.md`

---

## 1. What is open

`RFC-2026-012` decision 2 and 3, quoted rather than summarised:

> **2. Direct client reads only through named `security_invoker` views, never a base
> table** — including where a base table would be safe today. Column drift is silent, and
> RLS filters rows, not columns.
>
> **3. The read allowlist starts empty.** Each entry is added by RFC, not by a pull request.
> The inventory below is the *classification*, not the allowlist.

The allowlist is still empty, in the committed measurement and in the live database.
`db/foundation/lint/catalog-snapshot.json` records `exposed_views: []`; this run measured
`views_in_app = 0` against `xtvtflkntpqfvflvdbwk` on 2026-09-06 (M1).

Batch `030` hit the consequence and wrote down what it cost. Quoted from
`db/foundation/migrations/030_industry.sql`:

> So §9.1 licenses the CONTENT and `RFC-2026-012` licenses the OBJECT, and batch 030 can satisfy
> only the first. **No client role is granted anything on `app.industry_packs` or
> `app.industry_pack_versions` by this batch, and no `security_invoker` view over them is created.**
> The published catalog exists, is immutable, and is unreachable from the request path.

and, on the size of the thing an RFC would have to add:

> §8.5 requires an exposed view to be `security_invoker = true`, and such a view is evaluated with
> the CALLER's privileges on the underlying table. So the RFC that adds the entry must add the view
> AND a column-scoped SELECT grant to `authenticated` on the base table AND a SELECT policy
> admitting it, because these tables are FORCE ROW LEVEL SECURITY with no policy. Three objects,
> one decision, one review.

`§9.1` of `sprint-0a-core-erd-rls-retention-th.md:442`, for the record, in full:

> | `PUBLIC-0` | published industry catalog, public model label | normal integrity controls | allowed |

Five things are open and this RFC settles all five: what an entry **is**; what a candidate must
**satisfy**; whether the industry catalog **qualifies**; what happens to **`anon`**; and what the
schema lint must **assert** so the allowlist cannot grow without anybody noticing — given that a
rule whose whole content is *never* cannot express *only these*.

---

## 2. What was measured

Full queries and outputs are in the evidence file. Six results decide this RFC. All are read-only,
2026-09-06, instance `xtvtflkntpqfvflvdbwk`.

**Batch `030`'s three tables are not on that instance.** The snapshot declares `011`, `020`, `021`
and `030` `not_applied_to_this_instance`, so nothing below was measured on
`app.industry_packs`, `app.industry_pack_versions` or `app.industry_assignments`. Every probe is
built from batch `010`'s tables, the platform roles, the three views the platform ships, and the
catalog. Where a claim needs a view that does not exist, §9 says so and refuses to let it decide.

**M2 — every table in `app` is owned by a role that bypasses RLS.**
`app_table_owners = postgres`, `rolbypassrls(postgres) = true`. A view our migrations create is
created by `postgres` and owned by `postgres`. On a `FORCE ROW LEVEL SECURITY` table with no policy,
`security_invoker = true` is therefore not a style rule from `§8.5` — it is the entire difference
between zero rows and every row.

**M3 — a column-scoped grant covering every current column is not a table-wide grant. This is the
measurement that decides the RFC.**

```
has_table_privilege('authenticated','app.workspaces','SELECT')  = false
bool_and(has_column_privilege('authenticated', …every column…)) = true
has_table_privilege('app_worker','app.workspaces','SELECT')     = true
```

Two roles reach all seven columns today; one holds the table-level bit and one does not. A column
added tomorrow is readable by `app_worker` and **not** by `authenticated` until somebody writes a
new `GRANT`.

`RFC-2026-012` §2 rests on *"Column drift is silent, and RLS filters rows, not columns."* The second
clause is true and the first is **false in the grant shape batch `010` already writes**. That does
not overturn decision 2 — see §6, option D — but it does mean the reason usually given for it is not
the reason it holds, and a criterion built on the stated reason would be built on a false premise.

**M5 — a view fixes, at CREATE time, which base-table columns its caller must hold, and the set
includes columns the view never projects.** Read from `pg_rewrite.ev_action` for
`information_schema.schemata`: the `pg_namespace` range-table entry records
`selectedCols (b 8 9 10)` and the `pg_authid` entry records `(b 8 9)`. The view's definition
references `nspname`(2), `nspowner`(3), `oid`(1) of `pg_namespace` and `rolname`(2), `oid`(1) of
`pg_authid`. Both bitmapsets fit one offset and only one — member = attnum + 7 — and `nspowner` and
both `oid`s appear **only** in the join condition and inside `pg_has_role`.

Two consequences that point in opposite directions, and the RFC needs both:

* Widening a `security_invoker` view to a column outside the client's column-scoped base grant makes
  every query through that view fail `42501` — for every client, immediately. **Through a view, with
  a column-scoped base grant, column drift is loud.**
* A view cannot hide a column by filtering on it: the filter column must be granted to the caller
  too. **Row visibility has to be a policy**, not a `WHERE` clause, or the view has to be
  `security_definer` — which M2 says would bypass RLS as `postgres`.

**M4 — the grant layer and the policy layer are distinguishable, observed live.** As
`authenticated`: `select count(*) from app.workspace_invitations` succeeds and returns 0 (RLS);
`select token_hash` from the same table raises `42501: permission denied for table
workspace_invitations`. `token_hash` is the one column of twelve `authenticated` does not hold. This
is what `isolation-cases.mjs`'s `deniedBy: 'grant'` is asserting, and it is real.

**M6 — `anon` holds nothing anywhere in `app`, and its refusal is at the SCHEMA.**
`has_schema_privilege('anon','app','USAGE') = false`; zero executable functions in `app` or
`private`; zero rows in the whole column-privilege sweep. Live:

```
set local role anon; select count(*) from app.workspaces;
ERROR: 42501: permission denied for schema app
```

Opening `anon` on one view therefore costs `grant usage on schema app to anon`, which is **not
scoped to the entry**: it moves every object in `app`, present and future, from *the name does not
resolve* to *the name resolves and is refused per object*, and every anonymous isolation case
asserting `deniedOn: { kind: 'schema', name: 'app' }` changes layer that day.

**M7 — the same `CREATE VIEW` is inert in `app` and self-granting in `public`.** `pg_default_acl`
has **no row** for schema `app`, so a view created there arrives with an empty ACL. It has rows for
`public` and `storage` granting `anon`, `authenticated` and `service_role` `arwdDxtm` — *all*
privileges — on every table and view `postgres` creates there, with **no `GRANT` in any migration
text**. The static rule that guards the allowlist today scans migration text for
`grant … on app.<table> … to authenticated|anon`. It cannot see this path.

**M8 — the last hop is not measurable from here.** Whether schema `app` is exposed to the Data API
is project configuration; `pg_db_role_setting` holds no `pgrst.*` entry. We cannot assert it as a
control and must not rely on it as one.

---

## 3. What an allowlist entry **is**

Batch `030`'s three-object finding was checked, not inherited. It is right in substance and short by
two, and one of the two it is missing is the one that would have been forgotten.

An allowlist entry is **five objects and one registry row**:

| # | object | why it is separate | measured basis |
|---|---|---|---|
| 1 | `create view app.<name> … with (security_invoker = true)` | without the option the view runs as `postgres`, which bypasses RLS | M2 |
| 2 | `grant select (<explicit columns>) on app.<base table> to <role>` — **column-scoped, never table-wide** | a `security_invoker` view is evaluated with the caller's privileges on the base table; the column list is the projection's only enforceable ceiling and the only column-drift control | M3, M5 |
| 3 | `grant select on app.<view> to <role>` | the view has its own ACL. `030` folds this into (2); they are different objects, and in `public` this one would have arrived unwritten | M7 |
| 4 | a `SELECT` policy on the base table naming that role | the base table is `FORCE ROW LEVEL SECURITY`; without a policy the view returns zero rows, and the row filter cannot live in the view's `WHERE` because the filter column would have to be granted too | M5, §9(a) |
| 5 | `grant usage on schema app to <role>` | already true for `authenticated`; **not** true for `anon`, and not scoped to the entry when it is written | M6 |
| — | one row in `db/foundation/lint/read-allowlist.json` | the entry as data, so "is this on the allowlist" has one answer a build can read | §8 |

**Who owns each.** The family owner authors all five and the registry row, because the base table is
theirs and the column list is a statement about their data. A1 Security countersigns, because
objects 2, 3 and 5 are grants and object 4 is a policy, and `CONTRIBUTING_AGENTS.md` puts
RLS and data-classification changes behind an RFC with a security reviewer. The Product Owner
approves the RFC that names the entry. No pull request adds one.

**Which migration batch creates them.** A **new** batch in the family owner's range — never an edit
to the merged batch that created the table, which migration invariant 1 forbids. For the industry
catalog that is `031`, inside A2 Industry's `030`-`039` range. §6 of
`core-database-and-rls-workstream-th.md` reserves `170` for *"grants hardening + exposed view
review"* to Security, depending on *all*: that is where entries are **reviewed in aggregate**, not
where they are created. Reading `170` as the home of the first entry would put every family's
projection decision in one late batch owned by a role that does not own the data.

---

## 4. What a candidate must satisfy

Seven criteria. They are written so that a reviewer can apply them to the *next* candidate without
re-reading this document's argument about this one.

**C1 — A named caller exists, and it is a client.**
`010`'s rule, quoted: *"a grant issued ahead of the thing that needs it is a grant nobody reviews
against a caller."* The RFC adding the entry names the screen or the client module that reads it. A
server-side consumer is not a caller for this purpose; it is an argument for option C in §6.

**C2 — The projection is an explicit column list with a sensitivity beside each column, never
`select *`.**
A view over a `PUBLIC-0` table still chooses columns, and `select *` re-expands at
`create or replace` time. The RFC names the columns; the registry row records them; the lint
compares the two.

**C3 — The base grant is column-scoped and enumerates exactly the columns the view definition
touches — including join and filter columns — and no more.**
Not a table-wide grant, even where the two coincide today (M3). Join and filter columns are part of
the projection whether or not they are selected (M5); an entry that needs to grant a column it does
not want read is an entry whose view is shaped wrong.

**C4 — Row visibility is a policy on the base table, not a `WHERE` clause in the view.**
A view carries no row level security of its own, and a filter written into the view is defeated by
any other grant on the base table and requires the filter column be granted anyway (M5). For a
global table with no tenant predicate, the policy is the explicit statement *"every authenticated
caller may see every row of this table"*, written where a reviewer can disagree with it.

**C5 — The entry says which existing isolation cases change, and changes them in the same diff.**
Today the catalog's four cases assert `deniedBy: 'grant'`. An entry moves the refusal to the policy
layer for the granted columns and leaves it at the grant layer for the rest, and a candidate that
cannot enumerate which cases flip is a candidate nobody has read. The CI negative-control entries
for those tables must also be restated, because two of them currently rest on exactly one case each
(recorded in `work-packages/WP-0A-DB-00.json`).

**C6 — The sensitivity class permits the projection, *and* the object decision is made separately.**
`§9.1` licenses content; this RFC licenses objects. `PUBLIC-0` is necessary and not sufficient, and
this is `030`'s finding restated as a rule rather than as a one-off resolution.

**C7 — A global table states its blast radius in the RFC, in one sentence, in the first person.**
`030` found the asymmetry and it is the criterion that matters most. A tenant table's grant is
bounded by a predicate RLS can express — `app.is_active_member(workspace_id)` — so a mistake reaches
one workspace and the isolation suite proves the boundary. **A global table has no such predicate.**
The only bound is the column list, and the audience is every holder of a valid JWT. The RFC
must state, plainly, what it costs if the whole granted projection of the whole table is read by
everyone who has ever signed in — because that is not a worst case, it is the intended behaviour.

---

## 5. Do `app.industry_packs` / `app.industry_pack_versions` qualify?

Against the criteria: **C2, C3, C4, C6 and C7 are all satisfiable. C1 fails today, and C1 is not a
formality.**

**C1.** There is no client that reads the catalog. There is no `src/`. The only consumer named in
any source document is server-side, and the industry pack contract
(`sprint-0a-industry-research-pack-th.md:115`) is explicit that the pack itself is
*"versioned data/rules bundle ไม่มี executable code และไม่เข้าถึง network/database โดยตรง Core
Runtime เป็นผู้ load, validate, resolve และ pin version"*. Loading, validating, resolving and
pinning are server acts. `§6`'s registry puts the resolver at `070` at the earliest. `§8`'s four RLS
matrices contain **no row** for an industry pack anywhere, so there is not even a cell that says who
the reader is.

**C7, if it ever passes C1.** The blast radius sentence would read: *every authenticated user of the
product can enumerate the entire platform industry catalog, including packs not assigned to any
workspace they belong to, and this is intended.* That is probably fine for a published catalog. It
is worth having written down before it is true rather than after.

**What the view would project, if and when.** Not the tables — two views, one per table, because a
join makes both `id` and `industry_pack_id` into granted columns (M5) and those are the two columns
nobody wants a client to hold. Concretely:

* `app.industry_packs` → `pack_id`, `industry_key`, `publisher`. All three `PUBLIC-0`.
  **`id` is excluded**: it is the join key and a client that pins pins `pack_id`, which the industry
  pack contract makes the stable identity. Granting the surrogate would put a second identifier into
  circulation for the same row.
* `app.industry_pack_versions` → `version`, `display_name_th`, `released_at`, and the `pack_id` of
  the parent **only if** the view is willing to grant `industry_pack_id` and `app.industry_packs.id`
  to do the join, which C3 then has to record honestly.
* **`checksum` is excluded from the client projection.** `§9.3` classes a content hash as an
  integrity value and not a credential, and `030`'s column comment says so — so this is not a
  secrecy argument. It is C1 again: the checksum's only use is pinning, and pinning is what Core
  Runtime does. A column projected to a caller that cannot use it is a column nobody reviewed.

`030`'s §2 concern — *"column drift is silent"* — is the one part of its reasoning that M3 and M5
correct. Through a `security_invoker` view with a column-scoped base grant, drift is not silent: it
is a `42501` on the first client query. That removes the *mechanical* objection to a base-table read
and leaves the *review* objection, which is the one that actually holds: a view is a named object an
RFC can enumerate, and a base table is a shape that changes when its owner changes it. **Decision 2
survives its own reasoning being partly wrong**, and §6 option D says why that is not a reason to
reopen it.

---

## 6. Options

### A. Open the allowlist now, with the industry catalog as entry 1

*Makes true:* `§9.1`'s "client projection: allowed" becomes reachable; the first entry establishes
the five-object shape by example; `exposed_views` stops being vacuously empty and the lint that
reads it stops being a rule about nothing.

*Costs:* five objects and a policy that says every signed-in user sees the whole catalog, written
for a caller nobody has built. The four `deniedBy: 'grant'` cases become policy cases and the two
weakest CI negative-control entries lose their single case each.

*Makes unfalsifiable if chosen badly:* the projection. With no client screen, there is nothing to
compare the column list against, so an over-wide projection cannot be detected by review — only by a
later reader noticing. And an entry made before a caller exists sets a precedent whose reason is
absent from the record, which is how entry 2 gets approved by pointing at entry 1.

### B. Decide the mechanism, add no entry — **proposed**

*Makes true:* "grows only by RFC" acquires a definition. An entry is five objects and a registry
row; a candidate must pass seven criteria; the lint can express *only these* instead of *never*; and
the next candidate is judged against criteria rather than against precedent.

*Costs:* the catalog stays unreachable from the request path, and anything that needs it needs the
server tier, which does not exist either (§6 C). One more RFC is required before the first read
opens. The measured column-drift finding (M3/M5) is banked and unused.

*Makes unfalsifiable if chosen badly:* nothing structural — an empty allowlist with a defined growth
rule is checkable in both directions (§8). The honest risk is different and worth naming: **criteria
with no candidate have never been tested**, and C1–C7 could be subtly wrong in a way only a real
entry would reveal.

### C. Serve the catalog through the server tier and never open an allowlist entry for it

*Makes true:* the read exists without a new client-facing object; `RFC-2026-012` §4's mechanism —
`SECURITY DEFINER` command functions owned by `app_command`, invoked by an `authenticated` session —
gets its first *read* consumer, and the catalog is projected by code a reviewer reads rather than by
a column list a `create or replace` can change.

*Costs:* the server tier does not exist. `RFC-2026-019` §4/2 says the request path reaches
`app_command` only as the owner of a function it invokes, and no command function has been written;
`DATA-DEC-03` is open and due G1. So this option is not cheaper today — it is a different debt. It
also adds a hop for data classified `PUBLIC-0`, which is the least defensible place to spend
latency.

*Makes unfalsifiable if chosen badly:* nothing, and this is the option nobody is arguing for, so it
is worth saying clearly. **C is not an alternative to B; C is what B implies for this particular
candidate.** B decides how the allowlist grows. C is the disposition of the industry catalog under
those criteria, because it fails C1. A decision that adopted C *without* B would leave the allowlist
growth rule undefined and would have settled one candidate by avoiding the question.

### D. Grant `authenticated` `SELECT` on the base tables directly, as `010`, `020` and `021` do

*Makes true:* the shortest path. M3 shows the column-scoped grant already used by those batches is a
real column-drift control, so the usual objection is weaker than `RFC-2026-012` §2 states.

*Costs and why it is refused anyway:* three reasons, and the third is the one that decides.
(i) It contradicts an approved decision at position 1 of the conflict order, and this RFC is not a
request to reopen decision 2. (ii) `030`'s asymmetry: a base-table grant on a **tenant** table is
bounded by `app.is_active_member(workspace_id)`; on a **global** table nothing bounds it but the
column list. (iii) A view is a **named** object. The allowlist is a list of names, and a list of
names is auditable in a way "these columns of these tables" is not — `exposed_views` is a set the
lint can enumerate, whereas a base-table grant is indistinguishable in the catalog from the
inherited ones `010`–`021` already made.

*Makes unfalsifiable if chosen badly:* the boundary itself. Once client reads are base-table grants,
"is this table exposed" has no catalog-level answer, and `RFC-2026-012`'s decision 2 becomes
unenforceable rather than merely unenforced.

### E. Open for `anon` as well as `authenticated`

*Makes true:* a published catalog readable without a session — plausibly what a marketing surface or
an unauthenticated onboarding screen would want, and `§9.1` does class it `PUBLIC-0`.

*Costs, measured rather than asserted (M6):* `grant usage on schema app to anon` is object 5 and it
is not scoped to the entry. Today `anon`'s refusal on **every** object in `app` is
`42501: permission denied for schema app` — one check, before any object is considered. After the
grant, `app` becomes a namespace `anon` can resolve, and the refusal for every present and future
object moves to that object's own ACL. That converts one chokepoint into N per-object checks, N
grows with every batch, and the failure mode of a forgotten `revoke` changes from *unreachable* to
*reachable and hopefully refused*.

*Makes unfalsifiable if chosen badly:* the anonymous surface. `§8.5` says *"Policy ระบุ `TO
authenticated`; anonymous ไม่มี tenant policy"* — it forbids an anonymous **tenant** policy and is
silent on a global one, so nothing in the baseline would flag the grant. And with schema `USAGE`
granted, every future *"anon holds nothing"* assertion has to be made per object instead of once.

### F. Do nothing — leave `RFC-2026-012` §3 as the whole of the mechanism

*Makes true:* no new document; the allowlist stays empty; the existing test keeps passing.

*Costs:* §3 says entries are "added by RFC" and does not say what an entry is. The first entry would
therefore define the shape retroactively, in whatever batch happened to land it.

*Makes unfalsifiable if chosen badly:* the growth rule itself. The current guard is a test that
forbids one specific thing on two specific tables by scanning migration **text**. M7 shows a path
around it that requires no `GRANT` statement at all. A prohibition with an unenumerated scope and a
text-only reading is exactly how an allowlist grows while every rule still passes.

---

## 7. Decision proposed

1. **An allowlist entry is the five objects and the registry row in §3.** Authored by the family
   owner in a new batch in that family's range, countersigned by A1 Security, approved by RFC. Batch
   `170` reviews entries; it does not create them.

2. **A candidate must satisfy C1–C7 in §4.** A reviewer applies them to the next candidate without
   re-litigating this one.

3. **The allowlist stays empty. `app.industry_packs` and `app.industry_pack_versions` do not become
   entry 1**, because C1 fails: no client caller exists, and the one consumer any document names —
   Core Runtime, which loads, validates, resolves and pins — is server-side. **The disposition for
   the catalog is the server tier** (§6 C), owed to `DATA-DEC-03` and to the batch that brings the
   resolver, `070` at the earliest. When a client caller is specified, `031` is the batch and this
   RFC's criteria are the review.

4. **`anon` is decided, not deferred: `anon` is granted nothing — no schema `USAGE`, no table or
   column privilege, no function `EXECUTE` — anywhere our migrations reach, and the product has no
   unauthenticated database surface at G0.** The reason is M6 and it is structural rather than
   squeamish: the first `anon` grant is not one grant, it is `usage on schema app`, and it changes
   the denial layer of every object in `app` at once. If the product later wants an unauthenticated
   catalog, the two shapes to consider are the server tier and a **separate schema** whose entire
   contents are public by construction — not a widening of `app`. Reversing this needs an RFC that
   says what the anonymous surface is *for*, which is the sentence nobody has written yet and the
   reason an unstated position would have been arrived at by accident.

5. **The lint becomes a registry and a two-way conformance check, replacing the prohibition** (§8).
   This is the part of the decision that answers *"a rule whose whole content is never cannot
   express only these"*.

6. **Nothing else changes.** No view, no grant, no policy, no migration. `030`'s apply-time block is
   **not** amended: it deliberately asserts nothing about the absence of a client grant on the global
   tables, precisely so that an approved RFC would not make an applied migration's self-assertion
   false. That judgement was correct and this RFC does not disturb it.

---

## 8. What must be true before this closes, in artefacts a build can check

### 8.1 The allowlist becomes data

`db/foundation/lint/read-allowlist.json` — **an empty array on approval**, and the only place the
question *"is this on the allowlist"* is answered. Each future entry records:

```
{ "view": "app.<name>", "base_tables": ["app.<table>"], "columns": {"app.<table>": ["…"]},
  "roles": ["authenticated"], "rfc": "RFC-2026-0NN", "batch": "0NN_<name>.sql",
  "sensitivity": "PUBLIC-0", "caller": "<the client that reads it>" }
```

`caller` is C1 as a required field: an entry that cannot name one cannot be written down.

### 8.2 The static rule inverts, and is checked in both directions

The existing test — *"the industry pack catalog is not on the client read allowlist, and no
migration puts it there"* in `tests/db/identity/identity-isolation.test.mjs` — is replaced by a rule
over the whole migration set and the whole registry:

- every `create view` in schema `app` in any migration corresponds to a registry entry, **and**
- every client-role grant on any object in `app` in any migration is either an inherited base-table
  grant listed in the known-exceptions block (see 8.5) or corresponds to a registry entry, **and**
- every registry entry corresponds to objects that actually exist in the migrations.

Both directions matter. A grant with no entry is the failure the current rule catches. **An entry
with no objects is the failure that would let the registry become documentation.** While the array
is empty the rule is exactly as strict as *never*; the day it has one row it says *only this*, which
is the shape the current rule cannot express.

### 8.3 The catalog rule reads ACLs, not text

M7 is the reason and it is not hypothetical: in `public` and `storage` a bare `create view` by
`postgres` arrives granted `arwdDxtm` to `anon`, `authenticated` and `service_role` with no `GRANT`
in any migration. `exposed_views` in `catalog-snapshot.json` grows from a name to a measurement, per
view: `reloptions` (already read by `scripts/db/run.mjs:878`), `relacl`, the base tables it reads,
and the columns each client role can actually reach through it. `run.mjs` asserts that measured set
equals the registry. A view measured in `app` that the registry does not name is a finding; so is a
view outside `app` that reads an `app` table.

### 8.4 Three assertions that are decisions expressed as negatives

`RFC-2026-019` §5's shape — *"a negative is the strongest thing a lint can hold"*:

- **`has_table_privilege(<client role>, <base table behind an entry>, 'SELECT')` is false**, while
  the entry's named columns are true. A table-wide grant is a finding **even when it covers exactly
  the same columns today** (M3). This is the column-drift control as a rule.
- **`has_schema_privilege('anon','app','USAGE')` is false**, and any privilege `anon` holds on any
  object in `app` or `private` — table, column, function, sequence — is a finding. This is §7/4, and
  it is the form in which *"we did not grant it"* can fail a build.
- **`security_invoker` is present on every view in `app`**, asserted from `reloptions` in the
  catalog and from the migration text (`run.mjs:123` already does the second). M2 is why: without the
  option the view runs as `postgres`, which bypasses RLS.

### 8.5 The inherited grants are named, in one place, as exceptions rather than as silence

`010`, `020` and `021` grant `authenticated` `SELECT` on base tables, which `RFC-2026-012` §2 also
names. Migration invariant 1 forbids rewriting them, so 8.2's second bullet needs an explicit
known-exceptions list rather than a loophole. That list is **closed**: it enumerates exactly the
grants that exist today, and any new one fails. Closing it is A1's condition 2 on `RFC-2026-012`,
still unlanded, and it is a forward fix owed to `170` — not to this RFC.

### 8.6 Executable only, never citable — the two claims this run could not measure

`RFC-2026-020` §6.2's rule, applied. Batch `030`'s tables are not on the provisioned instance and
this run may issue no DDL, so the following two claims are **requirements to be discharged by
execution in the CI container that `make db-migrate-clean` builds, in the batch that lands the first
entry** — and by nobody quoting the PostgreSQL manual at a reviewer:

**(a)** A view `with (security_invoker = true)` over a base table that is `ENABLE` + `FORCE ROW
LEVEL SECURITY` with **no policy** returns **zero rows** to `authenticated` holding the column grant,
and returns rows only once a `SELECT` policy admits them.

**(b)** The **same** view **without** `security_invoker` returns **every** row to that caller,
because its owner `postgres` bypasses RLS (M2).

If (b) is false, M2's reasoning is wrong and §3's object 1 has to be re-derived. If (a) is false, an
entry needs an object nobody has named. **This RFC may be approved on its criteria; the first entry
may not be approved without these two proofs.**

---

## 9. Consequences

- One new lint data file (empty), one rewritten static test, three new negative assertions, and a
  widened `exposed_views` snapshot shape. **No view, no grant, no policy, no migration, no change to
  any merged batch.**
- The four `deniedBy: 'grant'` catalog isolation cases keep passing unchanged, and keep meaning what
  they mean, because the allowlist stays empty.
- The industry catalog remains unreachable from the request path. Anything that needs it before the
  server tier exists is blocked, and that is the cost, stated in §6 B rather than hidden.
- `RFC-2026-012` §2's stated reason — column drift is silent — is corrected on the record by M3 and
  M5 without its decision being reopened. A future RFC that wants to revisit decision 2 now has the
  measurement to argue from, and has to argue the auditability point in §6 D(iii) instead.
- `anon` acquires a position it did not have, and a lint rule that holds it.

---

## 10. What this does **not** decide

- **Whether the Core Runtime reads the catalog through the request path at all.** That is `070`'s and
  `DATA-DEC-03`'s. This RFC says only that if it does, it is not a client read.
- **The command surface.** `RFC-2026-012` §4 names `SECURITY DEFINER` command functions as the
  enforcement mechanism and no command function exists (`RFC-2026-019` §2). §6 C depends on that
  surface and does not create it.
- **The inherited base-table grants** in `010`, `020`, `021`. Named in 8.5, owed to `170`.
- **Realtime**, which `RFC-2026-012` records as unanswered. One thing is worth adding so nobody
  infers otherwise: `postgres_changes` publishes **base-table** row images under base-table RLS, so
  **an allowlist entry grants no subscription**. A view on the allowlist is not a realtime surface,
  and reading it as one would reach the base table the entry exists to avoid.
- **Whether schema `app` is exposed to the Data API** (M8). Outside the database and outside this
  repository; asserted by nothing here and relied on by nothing here.
- **The `CATALOG` retention class**, which `§5` assigns to `industry.core` and `§10` does not define.
  Batch `030` recorded it; it is A1 Data's, not this RFC's.
- **`§8`'s missing rows for the industry pack family.** `RFC-2026-012`'s own inventory labels that
  row an inference. It still is.

---

## 11. Provenance, and what to discount

The measurements are this run's, taken read-only on 2026-09-06 against `xtvtflkntpqfvflvdbwk` and
reproducible from the queries printed in
`evidence/WP-0A-DB-00/a1-rfc-021-measurements-2026-09-06.md`. **Batch `030`'s three tables are not
on that instance**, so every probe about the mechanism is built from objects that are —
`information_schema.schemata`'s rewrite rule, batch `010`'s column grants, `pg_default_acl`,
`pg_authid` — and the two claims that would have needed a probe view are in 8.6 rather than in the
argument.

**Three things a reviewer should discount, and I would rather name them than have them found.**

*First, I am not independent.* I am a subagent run in A0's vendor and model family, proposing a
decision A0 will review. `RFC-2026-019` §8 records that an approved RFC resting on a misread of
another approved RFC was caught by a person reading two documents together and not by the conflict
order. The same exposure applies here, one document further along, and it is not reduced by my being
labelled A1.

*Second, my proposal is the one that costs me nothing.* I am the security co-owner `RFC-2026-012`
names, and I am proposing that the allowlist I co-own stay empty. That is the direction with no
downside for the proposer, and it should be weighed as such. The strongest argument against §7/3 is
in §6 B's own cost line: criteria that have never been applied to a real entry may be subtly wrong,
and B defers finding out.

*Third, I corrected a premise of the decision I am extending.* `RFC-2026-012` §2 says column drift is
silent; M3 and M5 say it is not, in the grant shape this repository already writes. I have kept
decision 2 anyway, on an argument (§6 D(iii), auditability of named objects) that is **not** the
argument the approved RFC gives. A reviewer who thinks that argument is weaker than the original one
should say so, because in that case decision 2 is standing on less than it appears to.

---

## Rollback

Delete this file, the register row that cites it, and the measurements file. Nothing in the database
or in any migration depends on it. If §8's lint changes have already landed, reverting them restores
the current prohibition, which is strictly narrower and still passes.
