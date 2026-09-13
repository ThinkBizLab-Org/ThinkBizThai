# A1 Security/Privacy review — batch 080 (`content.core`), merged as PR #112

Run: `/claude/a1_bastion`
Role: independent Security/Privacy reviewer, named in `work-packages/WP-0A-DB-00.json`
`role_assignments.security_reviewer_agent_run_id`.
Subject: batch 080 (`content.core`), `49830ad` = merge of PR #112. Base of this review: `main` =
`c5eb1b9`.
Date: 2026-09-13.

**This document records findings. It advances no package status, signs nothing on any author's
behalf, writes `security_approved` nowhere, and repairs nothing it found.**

---

## 0. What I am, before anything else

**I am a subagent spawned by `/claude/a0_atlas`, the author of the work I am reviewing, and I run in
the same vendor and model family.** A0 wrote my task description, chose the threads I was pointed
at, and told me which one to press hardest on — the "exempt by ownership" sentence. It chose the
subject and the base.

What that does **not** weaken:

- Everything below that is a *measurement against the tree* or a *reading of documented PostgreSQL
  behaviour* stands on its own. A `file:line`, a `grep`, a quoted sentence from an approved RFC, a
  column of the §8.2 matrix — a reader can re-run or re-open each one, and I have written the
  command, the `file:line`, or the documented behaviour for every assertion so they can. A shared
  model does not make `001_service_roles.sql:39` say something other than `nobypassrls`.
- The central finding contradicts A0's own record in five places and contradicts the lint A0 wrote
  to enforce it. A review that confirmed its author would be the suspicious outcome here; this one
  does not.
- Finding S5 is one A0 did not point me at and is not a variant of the thread it chose.

What it **does** weaken, and I cannot fix from inside:

- **Framing.** A0 chose the threads. I pressed hard on the one it named and worked outward from
  there; a defect A0 did not think to point me at is a defect I probably did not find. §8 lists what
  I did not check, but I cannot list what neither of us thought of.
- **Shared blind spots.** A plausible-sounding claim about Postgres internals is exactly the kind of
  error A0 and I would make together — and the finding below *is* such a claim, which means the
  class is demonstrated rather than hypothetical. I caught this one only because A0 pre-suspected
  it and because the repository states the correct semantics elsewhere in its own files
  (`051_notification.sql:1013-1014`, `run.mjs:148`). **A claim of the same shape that no file
  happens to contradict is one I would very likely have passed.** Treat §8 as the more important
  section of this document, not the least.
- **Independence in the protocol's sense.** `CONTRIBUTING_AGENTS.md` §"Separation of duties"
  requires a distinct independent Security/Privacy reviewer. **This is a second reading, not a
  second opinion.** It does not satisfy `independence.prefer_cross_vendor_review`, does not lift
  `independence.cross_vendor_exception`, and must not be counted as the Security/Privacy signature
  RFC-2026-002 requires before a merge. PR #112 was merged without that signature — the state record
  says so plainly at `session-2026-09-13-batch-080-landed-fanout-cut.md:20-27` — and **this document
  does not retroactively supply it.**
- **No database.** This machine has no PostgreSQL. Every statement below about runtime behaviour is
  reasoning from *documented PostgreSQL 17 semantics* and from the repository's own committed
  catalog snapshot, and is labelled as such. **I executed no database run and cite no run id of my
  own.** Where a finding would be settled by an executed query, I say so.

---

## 1. Verdict on the primary thread, in one sentence

> **"Exempt by ownership" is FALSE**, and it is false twice over: `app_command` is not the owner of
> these five tables (`postgres` is — `db/foundation/lint/catalog-snapshot.json` records
> `"owner": "postgres"` for every tenant table, and `001_service_roles.sql:39-42` creates
> `app_command` `nobypassrls` and "never the table owner"), and **even if it were the owner, FORCE
> ROW LEVEL SECURITY is precisely the statement that ownership confers no exemption from policies**
> — which is what `080_content.sql:443-444` and `:769-771` say correctly, forty lines from where
> `:896-898` says the opposite.

The evidence line it rests on, if a reader takes only one:

```
db/foundation/migrations/001_service_roles.sql:39
create role app_command with nologin nobypassrls noinherit;
db/foundation/migrations/001_service_roles.sql:41-42
  'Owns the SECURITY DEFINER command functions (RFC-2026-017). NOBYPASSRLS, and never the table '
  'owner, so the policies written for it actually apply to it.'
```

The role was created so that the policies **apply** to it. Batch 080 cites the decision that created
it for the proposition that the policies **do not** apply to it.

---

## 2. FINDING S1 — HIGH. The mechanism batch 080 names for its writer does not exist

### 2.1 What is claimed

Five places state it. Two are in a merged migration, which under
`CONTRIBUTING_AGENTS.md` §"Ownership and change control" ("Never rewrite an integrated migration")
**cannot be edited** and must be corrected by forward fix:

1. `db/foundation/migrations/080_content.sql:896-898`
   > "the act that CREATES one is a SECURITY DEFINER command function owned by `app_command`, which
   > is **exempt from these policies by being the owner** rather than by holding a privilege
   > (RFC-2026-017 §3)."

2. `db/foundation/migrations/080_content.sql:112-115`
   > "it will insert as its owner and **be exempt from these policies**, which is what RFC-2026-017
   > §3 arranges by **keeping `app_command` off the table-owner role**."

   This sentence is incoherent on its own terms before Postgres is consulted: keeping a role *off*
   the owner role is what **denies** it an ownership exemption. The sentence gives the mechanism and
   its own negation as cause and effect.

3. `db/foundation/migrations/080_content.sql:1063-1065` — the converse framing, equally false:
   > "if `app_command` also owned the table, that function **would be exempt from the policies
   > above** by ownership and the narrowings would bound nothing it does."

   Under FORCE it would not be exempt and the narrowings would bound it.

4. `tests/db/identity/isolation-cases.mjs:11681-11683` — "exempt by ownership rather than by
   privilege".

5. `tests/db/identity/identity-isolation.test.mjs:8993-8994` — "exempt by ownership rather than by
   grant (RFC-2026-017 §3)".

Restated, correctly hedged, in `handoffs/WP-0A-DB-00-author-handoff.json:63` and
`evidence/WP-0A-DB-00/session-2026-09-13-batch-080-landed-fanout-cut.md:91`, both of which name it
as an open question rather than a fact. **Those two are not defects** and I record that they are
not: they are the repository catching itself. Commit `2cd1450`'s message states the weaker, true
form ("The writer content needs is a SECURITY DEFINER function owned by app_command
(RFC-2026-017 §3), not a worker with privileges") and does **not** contain the exemption claim;
`db/foundation/README.md` does not contain it either. I checked both and report them clean.

### 2.2 What PostgreSQL 17 actually does — reasoning from documented semantics

Under `ALTER TABLE … FORCE ROW LEVEL SECURITY`, the complete set of ways a role reaches a row is:

| path | applies to `app_command`? | evidence |
|---|---|---|
| superuser | **no** | `001_service_roles.sql:39` creates it `nologin … noinherit`, no superuser; `011_authorization_helpers.sql:359-369` is the shape of the attribute assertion this repository writes |
| `BYPASSRLS` | **no** | `001_service_roles.sql:39` — explicit `nobypassrls`, and `:16-17` records that it is stated rather than defaulted *because it is load-bearing* |
| table ownership **without** FORCE | **no, twice** | `app_command` is not the owner (`catalog-snapshot.json` — every tenant table `"owner": "postgres"`); and FORCE **is** set, `080_content.sql:446-459`, asserted at `:769-779` |
| a PERMISSIVE policy naming it | **no** | every policy in 080 is `to authenticated` (`:522-573`), and `:933-951` raises an exception if any policy names `app_command` |
| nothing else | — | — |

So `app_command` reaches **no row** of these five tables. The repository states this correctly in its
own files, which is why I can cite it rather than only assert it:

- `080_content.sql:443-444` — "FORCE as well as ENABLE, because **ENABLE alone exempts the table
  OWNER** and the owner is the role migrations run as."
- `080_content.sql:770-771` — "**Without FORCE the table owner is exempt** from every policy."
- `051_notification.sql:1013-1014` — "`postgres` owns every table in `app` and holds BYPASSRLS …
  and **BYPASSRLS beats FORCE**."
- `scripts/db/run.mjs:148` and `:622` — "ENABLE alone leaves the table owner exempt".

Every one of those says ownership exempts **only in the absence of FORCE**. `:896-898` says
ownership exempts **in the presence of FORCE**. Both cannot be true.

### 2.3 The claim is not merely wrong, it is inverted

Ownership does confer an exemption — from the **privilege** layer. An owner needs no `GRANT`. What
ownership does *not* confer, once FORCE is set, is exemption from the **policy** layer. Batch 080's
sentence is "exempt by ownership **rather than by holding a privilege**"
(`:897-898`) and "exempt by ownership **rather than by grant**"
(`identity-isolation.test.mjs:8994`). That is exactly backwards: ownership is the grant-layer
exemption, and FORCE is the repository's deliberate refusal of the policy-layer one.

### 2.4 What RFC-2026-017 §3 actually says

It says the opposite of what it is cited for. Verbatim, `RFC-2026-017-service-path-identity.md:58-61`:

> "`app_command` is deliberately **not** the table owner. A `SECURITY DEFINER` function executes as
> its owner, so a function owned by the table owner on a forced table **is subject to RLS and needs
> policies that name it** — which is the intended behaviour, and only holds if the owner is a role
> the policies can name."

And `§6`, `:87-88`:

> "Batch `010` (A1 Identity) writes tables **and** their policies, naming `authenticated` for user
> paths and `app_worker` / **`app_command`** for the operations the matrix marks `S`."

The approved decision requires **policies that name `app_command`**. Batch 080 writes none and makes
it an apply-time error to write one (`:933-951`). Under `CONTRIBUTING_AGENTS.md`'s conflict order an
approved RFC outranks an implementation's header comment, so the RFC governs and the migration's
citation of it is a misattribution.

`RFC-2026-019:79` is sometimes read as supporting the claim. It does not: its row
"`app_command` | by being the owner of a `SECURITY DEFINER` function the caller invokes" answers
*how a session becomes `app_command`*, not *what `app_command` may then reach*. That sentence is
correct and is a different question.

### 2.5 The decisive line — 080 asserts that its own writer cannot write

This is the finding I would put in front of a reader who has time for one fact.

`080_content.sql:752-808` declares `every_role` as
`array['authenticated','anon','app_worker','app_command','app_maintenance','app_authz']` (`:759-760`)
and `immutable_tables` as `content_versions, content_variants, quality_reviews` (`:766-767`), then
raises an exception at apply time if **any** of those roles holds INSERT, UPDATE or DELETE on **any**
of those tables (`:790-808`):

```sql
raise exception 'a version, variant or quality review can be written through a granted path: %', offending
```

**`app_command` is in that array.** So batch 080 makes it an apply-time error for `app_command` to
hold INSERT on `app.content_versions` — in the same file that says the writer of
`app.content_versions` will be a function owned by `app_command`. The migration forbids the
privilege its own stated design requires. This is not a latent inconsistency: it is enforced, in
CI, on every clean apply, and CI is green on it (run 34678716740).

### 2.6 Severity and what breaks

**HIGH.** The decision that `app_worker` is granted nothing rests entirely on the claim that the
`app_command` definer function is a working alternative. It is not one. Concretely:

1. **The writer path is not "unwritten", it is affirmatively locked.** The batch's own record says
   the cost is that "nothing in this repository can write a content version" *until a command
   function exists* (`:899-901`, and the same sentence in `2cd1450` and in the state record
   `:49-51`). That understates it. **Writing the function is not sufficient and never will be.** A
   forward fix must additionally (a) `GRANT INSERT … TO app_command` on three tables, which 080's
   assertion at `:790-808` refuses, and (b) add a PERMISSIVE INSERT policy naming `app_command`,
   which 080's assertion at `:933-951` refuses. Both refusals are inside 080's `do $$` block, so
   they bind at 080's apply time only and a later batch can supply both — but each is a reversal of
   a stated decision, not an increment to it.
2. **The correct mechanism is a service policy, and the access matrix says so.**
   `docs/sprint-0a/sprint-0a-core-erd-rls-retention-th.md:362` — `Content create/edit/version` is
   `Y Y Y N N | `**`P`**. Service is `P`, "ผ่านตาม policy/explicit capability" — *by policy or
   explicit capability*. The matrix specifies the writer as a capability granted by policy. Batch
   080 declines to define that capability, on a defensible ground it states at `:33-36` ("a `P` with
   no capability defined is not an `S`"), and the Product Owner's own note confirms the reading
   (`product-owner-disposition-generation-run.md:85-89`). **So the real gap is a service capability
   nobody has defined and an RFC-2026-022 service policy nobody has written — not a function nobody
   has typed.** The "exempt by ownership" sentence is what makes the second look like the whole job.
3. **Blocker 4 misattributes the row.** The state record's blocker 4
   (`session-2026-09-13-batch-080-landed-fanout-cut.md:78-79`) reads "No writer exists for the three
   immutable tables (**§8.2 row 3** + no command function)". Row 3 is
   `Approved/published version UPDATE/DELETE`, which is `N` for every column including Service and
   is *correctly* implemented as nothing. The act that is blocked is **creation**, which is row 2 —
   `Y` for owner/admin/editor, `P` for service. Filed against row 3, the blocker reads as "the
   matrix says no, so nothing is owed"; filed against row 2 it reads as "a `Y` cell and a `P` cell
   are both unimplemented and one of them needs an approved capability." The second is the true
   statement.
4. **A `Y` cell is implemented as nobody-ever, with no disposition covering it.** Batch 080 cites
   the Product Owner's 2026-09-10 batch-070 disposition for the `content_items.status` half
   (`:131-133`), and that citation is sound. I find **no disposition covering the
   version-creation half** — `product-owner-disposition-batch-070.md`,
   `-generation-run.md` and `-quadratic-strip.md` do not dispose it. So owner/admin/editor hold `Y`
   for "create/edit/version" and can create neither a version, a variant, nor a quality review, and
   the bridge offered for that gap is the false mechanism.

### 2.7 Is this stop-the-line?

**No — and I want to be exact about why, because my brief invited the label and the evidence has to
earn it.**

`CONTRIBUTING_AGENTS.md` makes stop-the-line "secret exposure, tenant leakage, duplicate external
side effects, lost jobs, migration divergence, irreversible deletion, or contract mismatch". The
test I applied is my brief's own: *does a control the repository believes it has fail to exist?*

It does not. Every control batch 080 claims **is real and is asserted both ways at apply time**:
immutability of the three tables holds at the privilege layer (`:790-808`) and at the policy layer
(`:811-828`); ENABLE and FORCE hold on all five (`:769-779`); `app_worker`, `anon` and `app_authz`
reach nothing (`:903-930`, `:1049-1057`); no policy names a non-`authenticated` role (`:933-951`);
the five restrictive narrowings are inspected on both halves (`:955-1044`). The false sentence is a
**rationale and a forward plan**, not a control. Nothing is more reachable than the repository
believes, and no tenant data is exposed. The error is conservative in direction: it describes a door
as open that is in fact bolted shut twice.

**What would make it stop-the-line, and what I am asking be watched:** RFC-2026-017 §4 names the
failure mode itself — "the temptation to silence it by widening a grant is the failure mode to watch
for". If a forward fix closes this gap by **granting `app_command` `BYPASSRLS`**, by **dropping
FORCE**, or by **making `app_command` the table owner**, then a real control is destroyed and that
change *is* stop-the-line. All three are the cheap fixes, all three are what the false sentence
makes look principled, and the correct fix — define the `P` capability, write an RFC-2026-022
service policy, grant column-scoped INSERT — is the expensive one. **I am recording this as the
specific thing the next reviewer should refuse.**

---

## 3. FINDING S2 — MEDIUM. The same false rationale is embedded in the lint that enforces the rule

`scripts/db/run.mjs:626-634` carries the error into the guard:

```
// RFC-2026-017 §3: app_command is deliberately NOT the table owner. A SECURITY DEFINER function
// owned by the table owner is exempt from the policies on a forced table, so the whole point of
// routing privileged writes through such a function dies if the owner is the table's owner.
```

and repeats it in the failure message at `:632-634`. "Exempt from the policies **on a forced
table**" is false — that is the one case where the owner is *not* exempt. `run.mjs:319` carries a
third instance in the `app_authz` rule.

The same file states the correct semantics at `:148` and `:622`. **`scripts/db/run.mjs` contradicts
itself on the central RLS fact of this repository, several hundred lines apart** — which is, with a
different subject, exactly the defect shape C0 recorded as D10 and D12 in
`c0-review-2026-09-06-night.md`.

**The rule itself is good and I am not asking for it to be removed.** Refusing `app_command` as a
table owner is sound defence in depth: it is what still refuses on the day somebody drops FORCE, and
it costs nothing. Only its stated reason is wrong. But a rule whose comment misstates the mechanism
is a rule the next agent will reason from — and the next agent, reading `:627-628`, will conclude
that ownership defeats FORCE and may act on it.

`run.mjs` is outside this package's `writable_paths` (`ownership.writable_paths` lists
`scripts/db/**`, so it is in fact writable) — **and I am repairing nothing regardless**, per my
brief.

---

## 4. Tenant isolation and deny-by-default — reviewed, no open path found

I traced every reachable path on all five tables. **I found no tenant-isolation hole.** Recorded
positively, with what I checked:

- **Deny-by-default at the privilege layer.** No `GRANT … TO PUBLIC`, no `GRANT ALL`, no
  `ALTER DEFAULT PRIVILEGES`, no schema `USAGE` grant anywhere in `080_content.sql` (grepped). Every
  grant is column-scoped and enumerated, `:474-513`. `anon` appears nowhere and is asserted to hold
  nothing, `:918-930`.
- **ENABLE + FORCE on all five**, `:446-459`, asserted against `relrowsecurity AND
  relforcerowsecurity` — two distinct catalog columns — at `:769-779`. This is the assertion that
  makes the rest of the model true, and it is correct.
- **Permissive policies all `TO authenticated`**, `:522-573`; asserted at `:933-951`.
- **The RESTRICTIVE narrowings' WITH CHECK halves.** All five carry both halves (`:589-736`), and
  the three child narrowings' WITH CHECK bodies are **textually identical to their USING bodies** —
  I compared them line by line. The header's reasoning at `:621-629` (a later batch granting a write
  would otherwise be admitted for every active member, including one the row's own item is hidden
  from) is correct and the implementation matches it.
- **Child-through-parent resolution.** `content_versions` resolves through `content_items`;
  `content_variants` and `quality_reviews` resolve through `content_versions` joined to
  `content_items` (`:634-736`). Each join pins `workspace_id` **and** `business_profile_id`
  **and** the parent id, so a child row naming a parent in another tenant matches no parent and is
  invisible to everyone. This is belt-and-braces with the composite FKs at `:297-299`, `:302-306`
  and their siblings, which are scope-path keys
  (`foreign key (workspace_id, business_profile_id, content_item_id)`) rather than id-alone keys —
  so the mismatched-tenant child row cannot be created in the first place. **Both layers agree; I
  found no gap between them.**
- **The page override**, `case when page_context_profile_id is null then …admits_business else
  …admits_page end`, is written identically in all ten halves. A null page falls to the business
  question rather than to `true`.
- **The writer names itself.** `created_by = (select auth.uid())` in both INSERT WITH CHECKs;
  `updated_by = (select auth.uid())` in both UPDATE WITH CHECKs (`:526-540`, `:546-559`). See S5 for
  the half of this that is missing.

One note on documented behaviour rather than a defect: the narrowings' `exists (select 1 from
app.content_items i …)` subqueries are themselves subject to `content_items`' own RLS, since
PostgreSQL applies row security to tables referenced inside policy expressions. That is *additive*
here — it can only narrow further — but it means the child narrowings depend on `content_items`
retaining a SELECT policy for `authenticated`. If a future batch removed it, the children would
become unreadable rather than over-readable. Failing safe, and worth knowing.

---

## 5. FINDING S3 — MEDIUM. Blocker 2: the dangling cross-tenant citation is an integrity and **retention** defect, not tenant leakage

`080_content.sql:183-184`:

```sql
constraint content_ideas_research_suggestion_fk
  foreign key (research_suggestion_id) references app.research_suggestions (id),
```

`id` alone, no scope path, and — I checked — **no `ON DELETE` clause**, so `NO ACTION`.

**My answer to the question my brief asked: it is an integrity risk, not a tenant-leakage risk, plus
one consequence nobody has written down.**

**Why it is not tenant leakage.** The column stores a UUID and nothing else. To read any *content*
of the cited suggestion, a caller must select from `app.research_suggestions`, which carries batch
070's own RLS and refuses the cross-tenant row. No column of tenant B's data becomes readable by
tenant A. The batch's own header reaches the same conclusion at `:88-90` ("Row level security still
prevents reading it; what is unprotected is a dangling cross-tenant citation") and I confirm it.

**The one confidentiality edge, stated so it is not overclaimed.** PostgreSQL's referential
integrity checks are documented to bypass row security so that integrity is maintained. So tenant
A's INSERT naming tenant B's suggestion id **succeeds**, and its success is an existence oracle: A
learns that a `research_suggestion` with that UUID exists somewhere in the database. Against random
v4 UUIDs this is not a practical enumeration channel — it confirms a UUID that A already obtained
out-of-band (a log line, a URL, a support ticket, an export) rather than yielding one. **LOW**, and
I would not block on it alone.

**The consequence I do not find written anywhere, and which I think matters more than the oracle:**
with `NO ACTION` and no scope path, **tenant A's row blocks deletion of tenant B's row.** Tenant B
cannot delete a cited `research_suggestion`; nor can a retention sweep. The family carries
`CONTENT-HISTORY` retention, §10 owns the window and batch 160 owns the sweep
(`:437-440` and the table comments) — so **batch 160's `app_maintenance` sweep over
`app.research_suggestions` will fail on any row a different tenant cites**, and the failure is
cross-tenant by construction. The same mechanism obstructs an erasure request: B asks for deletion
of their research suggestion and the delete errors because A cites it. The error text names the
constraint and the referencing *table*, not A's row values, so it leaks schema rather than data —
but the deletion does not happen.

**MEDIUM**, and I am filing it as a *retention and erasure* defect rather than only the integrity
defect blocker 2 records. The fix blocker 2 names — a composite unique constraint on
`app.research_suggestions` owed to batch 070's owner, so that a scope-path FK becomes possible — is
the right fix and also resolves this. It is owed by another owner, which is exactly why it needs to
be visible to that owner rather than parked as an 080 integrity note.

---

## 6. FINDING S4 — LOW-MEDIUM. `updated_by` is unchecked on INSERT, on both mutable tables

This one is mine; A0 did not point me at it.

`080_content.sql:537-538` states the principle: "§8.5: **the writer names itself, and the policy
checks the claim rather than trusting it.**" It is checked on UPDATE and **not** on INSERT.

- `content_ideas`: the INSERT grant includes `updated_by` (`:478-481`); the INSERT policy's
  WITH CHECK constrains `created_by` only (`:526-531`).
- `content_items`: identical shape — `updated_by` granted at `:493-495`, WITH CHECK at `:546-551`
  names `created_by` only.

So an editor may insert a row whose `updated_by` names **any UUID they choose**, including another
member of the workspace. Same-tenant only (the narrowing and the membership predicate both hold), so
this is not cross-tenant and not a privilege escalation — it is **audit attribution**. On a family
whose approval flow is batch 090's and whose §8.5 claim is that the writer's self-naming is checked
rather than trusted, a spoofable "who touched this" field is worth closing before something reads it.

`created_by` is correctly protected: it is checked, and a NULL fails the predicate
(`NULL = auth.uid()` is NULL, not true), so it cannot be evaded by omission.

**Related, LOW:** `updated_at` is in both client UPDATE grants (`:482`, `:496`) and **there is no
trigger anywhere in batch 080** — I grepped for `create trigger` / `before update` and found none.
So the client sets `updated_at` to any timestamp it likes. `created_at` is correctly safe: it
defaults to `now()` and is absent from both INSERT grants.

---

## 7. Remaining items, briefly

**S5 — LOW. `content_ideas.status` is client-writable free text with no vocabulary.** `status text`
with no CHECK (`:163-165`), and it is in **both** the INSERT grant (`:478-481`) and the UPDATE grant
(`:482-483`). Contrast `content_items.status`, which carries a CHECK (`:234-236`) and is
deliberately outside the UPDATE grant. The asymmetry is defensible today — the batch refuses to
invent a vocabulary §4.6 does not enumerate, and says so at `:60-66` — and the security consequence
is nil while nothing reads the column. It becomes a real one the moment any command or worker
branches on `content_ideas.status`, because that value is attacker-chosen within the tenant. Filed
as a constraint on batch 090 and on whoever defines the `P` capability from S1: **do not read
`content_ideas.status` as a trusted state until it has a CHECK.** This is blocker 1's column; I am
adding the "do not branch on it" consequence, which blocker 1 does not state.

**S6 — LOW, deferred by disposition. `app.generation_runs` is owned by nobody.**
`content_versions.generation_run_id` (`:275-277`) and `quality_reviews.generation_run_id` carry no
FK. The Product Owner disposed this as option ก on 2026-09-10
(`product-owner-disposition-generation-run.md:43-56`) and the disposition is correctly cited in the
table comments. **No security consequence today** — the referenced table does not exist, so there is
nothing to leak and nothing to dangle. The risk is deferred and dated: when a future batch creates
`app.generation_runs`, these two columns will be unenforced **and** carry no scope path, which is
the shape of S3 above. Whoever creates that table inherits S3's problem twice unless the columns get
composite keys in the same change. The disposition anticipated the enforcement gap; it did not
anticipate that the gap would be cross-tenant-shaped.

**Secrets, PII and fixtures — clean.** `npm run scan:secrets` exits **0**. Batch 080's fixture
(`tests/db/identity/fixtures/080-content-fixture.sql`) is synthetic throughout: all 22 UUIDs are
uuid5-derived per `db/foundation/seeds/fixture-catalog.json:4`
(`uuid5(namespace, 'thinkbizthai.fixture.' || symbol)`) and therefore recomputable rather than
copied; every string body is prefixed `fixture …`; the only Thai strings are
`"ข้อความตัวอย่างสำหรับ fixture"` ("sample text for fixture") at `:237,241,245`; no emails, phone
numbers, names, tokens or credentialed URLs anywhere under `db/` or `tests/`. `evidence/WP-0A-DB-00/`
is clean on the same sweep. No `.env`, `*.pem`, `*.key`, `*.p12` or `*.pfx` exists on disk, is
tracked by `git ls-files`, or was ever added on any ref (`git log --all --diff-filter=A`).

**S7 — INFO, two coverage gaps in the scanner itself**, found while confirming the above and
recorded because they are properties of the control rather than of batch 080:

1. `scripts/scan-repository-secrets.mjs:360-374` — the `secret-named-assignment` rule matches
   **uppercase env-var style with `=`** only. A lowercase colon-style secret in a SQL comment
   (`-- api_key: abc123def456ghi789`) passes clean. Vendor-prefixed credentials (AWS, GitHub,
   Stripe, Slack, OpenAI, Anthropic, Meta, Vault, JWT, PEM) are caught regardless of comment syntax,
   and the exclusion is documented at `:362-364` — so this is a known edge, not a regression.
2. `scripts/scan-repository-secrets.mjs:24,461` — `PII_PROSE_PREFIXES` makes the `email-address`
   rule prose-exempt under `evidence/` and `handoffs/`. **A real customer email committed into
   `evidence/` would not fail this scan.** Payment cards, Thai national IDs and Thai phone numbers
   are *not* prose-exempt and do fire there. Given that `CONTRIBUTING_AGENTS.md` requires evidence to
   contain no real customer data, the one class most likely to appear in a pasted log is the one
   class exempted. An independent grep found nothing, so nothing is exposed today.

**`CONTRIBUTING_AGENTS.md` §"Non-negotiable security and data rules" — what 080 touches.** Tenant
isolation and deny-by-default RLS: satisfied (§4). Secrets/PII/fixtures: satisfied. Stop-the-line
list: none triggered (§2.7). Payment entitlement, publishing idempotency, and production object
deletion: not touched by this batch. Retention: see S3 — the erasure obstruction is the one rule
in that section 080 brushes against without naming.

---

## 8. What I did NOT review

Read this section before relying on the rest.

- **I ran no database.** No PostgreSQL on this machine. Every runtime claim above is from documented
  PostgreSQL 17 semantics plus the committed `catalog-snapshot.json`. **I did not verify against a
  live instance that `postgres` owns the five new tables** — the snapshot predates 080's apply, as
  `080_content.sql:1060-1062` itself notes, and 080 asserts only that the owner is *not*
  `app_command`/`app_authz`, never positively which role it is. The owner is whichever role runs the
  migration. The single query that would settle S1's second half is
  `select relname, pg_get_userbyid(relowner) from pg_class where relnamespace = 'app'::regnamespace`,
  and **nobody has run it against a database with 080 applied.** It should be run in CI.
- **I did not hand-simulate the 79 isolation cases.** That is `/claude/q0_sentinel`'s brief and I did
  not duplicate it. I read the two cases carrying the false sentence and no others in depth.
- **The CHECK constraints' contents** — the `findings` shape check, the seven-value `status`
  vocabulary on `content_items`, the `nulls not distinct` logical key — I read but did not test.
  Blocker 3 is real and I have nothing to add to it.
- **Batches 000–070 and 110–140.** I read `001` and `011` for role attributes and `051` and `070`
  for the semantics they state, nothing more. If the "exempt by ownership" error has siblings in
  batches I did not open, I did not find them. Given §0's shared-blind-spot warning, **I think a
  sweep for that specific sentence shape across every batch is owed**, and I did not do it.
- **`RFC-2026-018`** I read only far enough to confirm it was superseded for proposing a second
  service path (`RFC-2026-019` §3), which is the ground 080 cites for refusing `app_worker` grants.
  That ground is sound and survives S1 — refusing a second path is right; the first path just does
  not exist yet.
- **`db/foundation/lint/service-policy-map.json`** — I confirmed 080 adds no entry and that this is
  deliberate, but I did not audit the file's existing entries or the rule that reads them.
- **Whether the §8.2 `P` for content service *should* become a defined capability**, and what shape
  it should take. That is a Product and architecture question, not a security one. I say only that
  until it is answered, content cannot be written.

---

## 9. Summary

| # | Severity | Finding |
|---|---|---|
| S1 | **HIGH** | "Exempt by ownership" is **false**; `app_command` is `nobypassrls`, is not the table owner, and FORCE binds the owner anyway. 080 asserts at apply time that `app_command` may not hold the INSERT its own stated writer needs. RFC-2026-017 §3 says the opposite of what it is cited for. |
| S2 | MEDIUM | `scripts/db/run.mjs:626-634` embeds the same false rationale in the guard, and contradicts its own `:148`/`:622`. The rule is sound; its reason is not. |
| S3 | MEDIUM | Blocker 2's cross-tenant FK is an **integrity + retention/erasure** defect, not tenant leakage. It blocks batch 160's sweep and erasure of a cited row across tenants. Existence-oracle edge is LOW. |
| S4 | LOW-MED | `updated_by` unchecked on INSERT on both mutable tables; §8.5's "the policy checks the claim" holds for UPDATE only. `updated_at` client-settable, no trigger. |
| S5 | LOW | `content_ideas.status` is client-writable free text with no CHECK — do not branch on it. |
| S6 | LOW | `app.generation_runs` unowned; two unenforced columns will inherit S3's cross-tenant shape when that table is created. |
| S7 | INFO | Two documented coverage gaps in `scan-repository-secrets.mjs`; nothing exposed today. |

**Stop-the-line: no.** Every control batch 080 claims exists and is asserted both ways; the defect is
a rationale and a forward plan, and it errs conservative. **It becomes stop-the-line if the forward
fix grants `app_command` `BYPASSRLS`, drops FORCE, or makes `app_command` a table owner** — the three
cheap repairs the false sentence makes look principled.

**Tenant isolation and deny-by-default on all five tables: no open path found**, including both
halves of all five restrictive narrowings and the child-through-parent resolution.

This review is a second reading by the author's own vendor and model family. It is not the
independent Security/Privacy signature RFC-2026-002 requires, and PR #112 still lacks that
signature.
