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

6. `work-packages/WP-0A-DB-00.json:330` — the blocker batch 080 added to the manifest:
   > "The writer they wait for is a SECURITY DEFINER function owned by `app_command`, **exempt by
   > OWNERSHIP rather than by privilege** (RFC-2026-017 §3)"

   **I missed this one on my first pass** and record that I did: my repository-wide grep covered
   `db/ handoffs/ evidence/ architecture/ scripts/ tests/ test-kits/` and **not** `work-packages/`.
   The Integration Owner pointed me at it. It matters more than its position in this list suggests,
   because a manifest blocker is what the *next* agent reads when deciding what is owed — the
   migration header is read by whoever opens the migration, but the blocker is read by whoever picks
   up the package.

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

### 2.7 On its own, S1 is not stop-the-line — but it does not stand on its own. See S8.

Taken by itself, the inverted sentence errs *conservative*. Every control batch 080 claims **is real
and is asserted both ways at apply time**: immutability of the three tables holds at the privilege
layer (`:790-808`) and at the policy layer (`:811-828`); ENABLE and FORCE hold on all five
(`:769-779`); `app_worker`, `anon` and `app_authz` reach nothing (`:903-930`, `:1049-1057`); no
policy names a non-`authenticated` role (`:933-951`). Nothing is *more* reachable than the
repository believes. The error describes a door as open that is in fact bolted shut twice.

That was my initial verdict, and **I revised it.** The Integration Owner pressed me to stop pricing
the false sentence and start pricing what it *licenses downstream*. Doing that produced **S8**,
which is a different kind of finding: a control the repository states it has, in an applied
migration, **that does not exist**. My verdict is in §9 and it is **stop-the-line**, on S8's
evidence and not on S1's.

**Separately, and still true:** RFC-2026-017 §4 names the failure mode by name — "the temptation to
silence it by widening a grant is the failure mode to watch for". If a forward fix closes S1's gap
by **granting `app_command` `BYPASSRLS`**, by **dropping FORCE**, or by **making `app_command` the
table owner**, a real control is destroyed. All three are the cheap fixes and all three are what the
false sentence makes look principled. **I am recording this as the specific thing the next reviewer
should refuse.**

---

## 2A. FINDING S8 — HIGH, **STOP-THE-LINE**. The five scope narrowings will not bound the writer the batch is waiting for

This is the finding S1 licenses, and it is the one I would act on first.

### 2A.1 The claim

`080_content.sql:1063-1065`, in the ownership assertion:

> "the writer this family is waiting for is a SECURITY DEFINER function owned by `app_command`: if
> `app_command` also owned the table, that function would be exempt from the policies above by
> ownership and **the narrowings would bound nothing it does**."

The contrapositive is the belief: because `app_command` is kept off the owner role, **the narrowings
*will* bound what the command function does**. And `:621-629` states the same belief in its most
explicit form, reasoning about exactly this future:

> "It is written anyway, and the reason is the direction a mistake travels. **If a later batch grants
> a write here — a command path taking a shortcut, a `P` cell somebody decides to implement** — a
> narrowing with no WITH CHECK would admit that write for every active member of the workspace,
> including one the ROW's own item is hidden from."

That paragraph is the batch's stated defence against the precise scenario S1 makes inevitable. It is
why all five narrowings carry both halves.

### 2A.2 The measurement

All five RESTRICTIVE narrowings are written **`for all to authenticated`** —
`080_content.sql:590-591, 606-607, 635-636, 665-666, 703-704`:

```
$ grep -n -A2 'as restrictive' db/foundation/migrations/080_content.sql | grep -E 'as restrictive|to '
590:  as restrictive
591-  for all to authenticated
606:  as restrictive
607-  for all to authenticated
635:  as restrictive
636-  for all to authenticated
665:  as restrictive
666-  for all to authenticated
703:  as restrictive
704-  for all to authenticated
```

**A policy applies only to the roles named in its `TO` clause.** A RESTRICTIVE policy `TO
authenticated` does not apply to `app_command`, and never will, whatever else changes.

### 2A.3 Therefore

When the promised writer arrives — a `SECURITY DEFINER` function running as `app_command`, carrying
the permissive INSERT policy naming `app_command` that RFC-2026-017 §6 **requires** — **none of the
five scope narrowings will constrain it.** Not because a WITH CHECK half is missing; both halves are
present on all five and I verified they are textually identical. Because the narrowings do not name
the role.

The bound on the command writer would be **only** whatever its own new permissive policy says. The
batch's stated model — `:580-581`, "A PERMISSIVE policy above says the caller is a member of the
workspace. A RESTRICTIVE policy here says the caller's SCOPE admits this row, **and both must
hold**" — holds for `authenticated` and for no other role.

So the defensive measure written for "a command path taking a shortcut" (`:624`) does not cover a
command path. It covers a future `authenticated` grant, which is the case the comment does *not*
name.

### 2A.4 Why this is stop-the-line, in those words

My brief's test: *does a control the repository believes it has fail to exist?* Here it does.

- **Belief**, stated twice in an applied migration: the five narrowings bound every writer on these
  tables, the future command writer included (`:621-629`, `:1063-1065`).
- **Reality**: they bound `authenticated` alone. The command writer is outside them.

This is **tenant-scope enforcement that the repository records as present and that is absent** for
the only writer the design contemplates. Under `CONTRIBUTING_AGENTS.md` that is the tenant-isolation
family, and I am naming it **stop-the-line**.

**Honest about the exposure's tense, because it changes the remedy and not the label:** no data is
reachable today — `app_command` has no grant, no policy and no function, so there is nothing to
escape. The defect is *designed in and latent*, with a live trigger: the next agent implementing the
`P` capability reads `:621-629` and `:1063-1065`, concludes the scope narrowing already holds, adds
the permissive policy RFC-2026-017 §6 requires, and ships a content writer with **no business- or
page-scope bound at all** — able to write a version under any item in any workspace. The migration
saying so cannot be edited (`CONTRIBUTING_AGENTS.md`: "Never rewrite an integrated migration"), so
the correction must be a forward fix that is *louder than the sentence it corrects*.

**What the forward fix must do** (recorded so it is not rediscovered, and repairing nothing myself):
the service policy for the `P` capability must carry its own scope predicate, or the narrowings must
be re-created naming `app_command` alongside `authenticated`. A permissive INSERT policy naming
`app_command` **without** one of those two is the failure this finding predicts. That is the second
thing the next reviewer should refuse, alongside §2.7's three.

---

## 2B. FINDING S9 — MEDIUM. "Nothing in this repository can write a content version" is literally false, and what does write one is the worst available answer

The Integration Owner asked whether the fixture bears on this. It does, and not in the direction the
sentence assumes.

`tests/db/identity/fixtures/080-content-fixture.sql` **inserts into all three immutable tables on
every CI run** — `:171` `insert into app.content_versions`, `:209` `insert into
app.content_variants`, `:231` `insert into app.quality_reviews`. CI is green
(run 34751714594 on this branch; 34678716740 on `main`). So content versions **are** written in this
repository, routinely, today.

**Who writes them.** The fixture changes role nowhere — I grepped it for `set role`, `reset role`,
`security definer` and the `private.as_*` helpers and found **zero** occurrences, against 3 inserts.
It is applied on the same connection as the migrations. In CI that connection is the `postgres:17`
service container declared at `.github/workflows/ci.yml:24-26` with `POSTGRES_PASSWORD: postgres`
and **no `POSTGRES_USER`**, so the role is the image default `postgres` — which in that container is
a **superuser**, is the **owner** of every table the migrations create, and holds **`BYPASSRLS`**
(pinned in `run.mjs:1074`'s `KNOWN_BYPASS`, and `051_notification.sql:1013-1014` states the
consequence: "**BYPASSRLS beats FORCE**").

**So the fixture's success is not evidence for the `app_command` path. It is evidence against it.**
It demonstrates that the only identity in the system that can write a content version is
`postgres` — a bypassing superuser and table owner, the *exact* role
`RFC-2026-017` was written to keep off the data path (§2: "both of the obvious options bypass";
§3: "`service_role` and `postgres` are **reserved for migration and platform administration**.
Neither is used by application or worker code"). The one thing that can write content is the one
thing that is not allowed to.

**The sentence to correct.** "Nothing in this repository can write a content version, variant or
quality review" appears in `080_content.sql:899-901`, in commit `2cd1450`, in the state record
`:49-51`, and — in capitals — in the manifest blocker at `work-packages/WP-0A-DB-00.json:330`
("NOTHING IN THIS REPOSITORY CAN WRITE A CONTENT VERSION, A VARIANT OR A QUALITY REVIEW"). The true
statement is narrower and sharper:

> **No identity the access matrix describes — no client role and no service role — can write a
> content version. Only the migration superuser can, and it does so on every CI run.**

**Why this is MEDIUM and not cosmetic.** The false sentence makes the gap sound like an *absence*
("nothing can do this yet"), which reads as safe. The true sentence names a *dependency*: the test
evidence for this family is produced by a bypassing superuser, so **every green assertion about
these three tables is an assertion about what `postgres` can do**, and the isolation suite's
coverage of them is exactly the set of cases that assume a non-bypassing identity. That is not
wrong — the suite's `deniedBy: 'grant'` cases are honest and the batch labels them
(`isolation-cases.mjs:11677-11678`) — but a reader who believes the tables are unwritable will not
think to ask what the fixture had to become in order to populate them.

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

I traced every reachable path on all five tables. **For `authenticated`, I found no tenant-isolation
hole.** Everything in this section is conditioned on that role, which is the only role any policy in
batch 080 names — and **that condition is finding S8**, not a formality. Recorded positively, with
what I checked:

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

## 7A. The branch-identity red, measured — and why I did not rewrite A0's handoff

I was instructed that repointing `ownership.branch` makes `npm run check` red at 584/586, that the
only mechanical remedy is to rewrite `handoffs/WP-0A-DB-00-author-handoff.json` so it cites *my*
work, that I must not do that, and that I should therefore take the red and record it as a finding.

**I did not rewrite A0's handoff** — `git diff --name-only c5eb1b9..HEAD` returns four paths and that
file is not among them. **And the instruction was right: the branch ends red locally.** I reported
otherwise at an intermediate point in this review and that report was wrong. The correction, and how
I came to make the error, are below — it is the same error class this whole document is about, so it
would be dishonest to quietly fix it.

**The guard.** `test-kits/handoff-conformance.test.mjs:233-253` compares the handoff's cited head
(`d6e08c7`) against `branchTipBefore()` (`scripts/refresh-author-handoff.mjs:106-150`), which is the
**single parent** for an ordinary commit. It makes two assertions: the cited head must not be
`unrelated` to that tip, and no *substantive* path may have changed between them.

| branch state | `HEAD` | tip compared against | verdict |
|---|---|---|---|
| uncommitted, on the PR #113 merge | `c5eb1b9` | `49830ad` (**first** parent = `main`'s side) | `unrelated` → **584/586 RED** |
| one commit | `ffcf4e8` | `c5eb1b9` | clean → **586/586 green** |
| **two commits** | `de1e887` | `ffcf4e8` — **my own first commit** | **`drifted`, 2 substantive paths → 584/586 RED** |

Measured directly against the guard's own exported helper:

```
$ node -e 'import("./scripts/refresh-author-handoff.mjs").then(m=>…)'
ffcf4e8 state=drifted paths=["test-kits/branch-identity.test.mjs","work-packages/WP-0A-DB-00.json"]
de1e887 state=drifted paths=["test-kits/branch-identity.test.mjs","work-packages/WP-0A-DB-00.json"]
c5eb1b9 state=drifted paths=[]
```

and the failure verbatim:

```
NOT clean: exit 1 — tests 586, pass 584, fail 2, skipped 0, todo 0
  ✖ the handoff for this branch describes this branch
    WP-0A-DB-00's handoff cites head d6e08c7, after which 2 substantive path(s) changed:
      test-kits/branch-identity.test.mjs
      work-packages/WP-0A-DB-00.json
```

**Where I went wrong.** I hit the first red (the `unrelated` one), diagnosed its mechanism correctly,
committed, saw green, and concluded the dilemma did not arise. It did not arise *for a branch with
exactly one commit*, because then the compared tip is the merge base and the only paths in range are
A0's own. **The green was an artifact of commit count, not evidence about the repoint** — and I
generalised from a single observation to a claim about the branch. That is precisely the move
`080_content.sql:896-898` makes about Postgres ownership, and I made it in a document criticising it.
The instruction not to trust that green was correct and I should have tested a second commit before
reporting.

**The dilemma is real, and I am taking the red.** With two or more commits the two substantive paths
are `test-kits/branch-identity.test.mjs` and `work-packages/WP-0A-DB-00.json` — **the exact two files
my brief ordered me to change** to repoint `ownership.branch`. So repointing the branch as instructed
is what puts the guard in this state, and the only mechanical remedy the guard names is
`npm run refresh:handoff`, which rewrites `handoffs/WP-0A-DB-00-author-handoff.json` to cite **my**
revision range as though A0's handoff described my review. **I have not run it and will not.**
Rewriting another run's artifact to buy my own green is falsifying evidence I do not own, and it
would hollow out the §0 disclosure this document opens with.

**So the recorded state of this branch is: `npm run verify` RED at 584/586, for that reason, by
choice.** It is the correct outcome, not a defect to route around.

**CI and local disagree, and that is worth its own line.** CI run `34751714594` at `de1e887` reports
this same test **✔ passing**, 586/586. CI evaluates from the pull request's merge commit rather than
from an ordinary commit, so `branchTipBefore` takes a different parent and the comparison lands
somewhere benign. **A guard that is red on the developer's tree and green in CI is not enforcing what
it claims** — and it is green in CI for the branch whose handoff genuinely does *not* describe it,
which is the one case the guard exists to catch. I am recording this as an observation about the
control, not as something I repaired.

**What I did hit, and fixed properly.** CI run `34751544493` failed at `Verify branch scope`,
**exit 74** — not 75, and not the handoff:

```
WP-0A-DB-00 declares 1 amendment(s) that explain nothing this branch changed:
  OVERNIGHT-SUMMARY.md
```

`ownership.amends_without_owning` still declared `OVERNIGHT-SUMMARY.md` from the previous increment,
which prepended a staleness notice to it. **This branch does not touch that file**, and a
declaration matching none of the diff is precisely what that guard exists to catch — "a standing
permission over another package's file, granted for work that never happened". I narrowed the
declaration to the two files this increment genuinely amends and rewrote its rationale to describe
this increment. That is editing **my own package's manifest to describe my own branch**, which is
the opposite of editing another run's artifact to describe mine.

**S10 — MEDIUM, protocol control.** The handoff guard is red locally and green in CI for the same
commit; its local remedy rewrites an artifact the running agent does not own; and the two paths it
flags are the two a branch repoint is *required* to touch. Any package whose second increment
repoints `ownership.branch` meets this, and the cheapest way out is to falsify the previous author's
handoff. Owed to whoever owns `scripts/refresh-author-handoff.mjs` and the CI contract.

**One thing I did not measure**, and will not assert: the claim that *not* repointing leaves the
branch-scope step at exit 75. I repointed, as my brief instructed, so I never ran that path. Reading
`.github/workflows/ci.yml:56-62`, a branch no manifest claims fails `verify-branch-identity.mjs`,
falls through to `verify-disposition-branch.mjs`, and exits that identity status — so a nonzero exit
is right and 75 is plausible. **I have not run it and do not claim the number.**

**The protocol observation worth keeping**, which is the part of the instruction that was pointing at
something real: this guard **reads differently before and after the commit it is guarding**, and
only on a branch whose base is a merge. An agent who runs `npm run check` on a clean tree before
committing sees a red that committing alone resolves, and the fix it names — `npm run refresh:handoff`
— would have rewritten another run's artifact for a failure that was about to evaporate. That is a
live trap with a documented lure, and the next agent to stand on a merge base will meet it.

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
| **S8** | **HIGH — STOP-THE-LINE** | **The five RESTRICTIVE scope narrowings are `to authenticated` and will not bound the `app_command` writer the batch is waiting for.** The migration states twice that they will (`:621-629`, `:1063-1065`). Tenant-scope enforcement the repository records as present is absent for the only writer the design contemplates. |
| S1 | **HIGH** | "Exempt by ownership" is **false**; `app_command` is `nobypassrls`, is not the table owner, and FORCE binds the owner anyway. 080 asserts at apply time that `app_command` may not hold the INSERT its own stated writer needs. RFC-2026-017 §3 says the opposite of what it is cited for. Six locations, including the manifest blocker. |
| S9 | MEDIUM | "Nothing in this repository can write a content version" is **literally false** — the fixture writes all three immutable tables on every CI run, as the `postgres` superuser/owner/`BYPASSRLS` role that RFC-2026-017 reserves for migration only. Not evidence for the `app_command` path; evidence against it. |
| S2 | MEDIUM | `scripts/db/run.mjs:626-634` embeds the same false rationale in the guard, and contradicts its own `:148`/`:622`. The rule is sound; its reason is not. |
| S3 | MEDIUM | Blocker 2's cross-tenant FK is an **integrity + retention/erasure** defect, not tenant leakage. It blocks batch 160's sweep and erasure of a cited row across tenants. Existence-oracle edge is LOW. |
| S4 | LOW-MED | `updated_by` unchecked on INSERT on both mutable tables; §8.5's "the policy checks the claim" holds for UPDATE only. `updated_at` client-settable, no trigger. |
| S5 | LOW | `content_ideas.status` is client-writable free text with no CHECK — do not branch on it. |
| S6 | LOW | `app.generation_runs` unowned; two unenforced columns will inherit S3's cross-tenant shape when that table is created. |
| S7 | INFO | Two documented coverage gaps in `scan-repository-secrets.mjs`; nothing exposed today. |
| S10 | MEDIUM | Protocol control: the handoff guard is RED locally and GREEN in CI for the same commit, flags the two files a mandated branch repoint must touch, and its only remedy rewrites the previous author's handoff. This branch is left **red at 584/586 by choice**. See §7A. |

**Stop-the-line: YES, on S8.** I record that this **revises my initial verdict**, which was "no" on
S1 alone. S1 by itself errs conservative — it describes as open a door that is bolted twice. S8 is
the opposite shape: **a control the repository states it has, in a migration that cannot be
rewritten, that does not exist.** The exposure is latent today (no grant, no policy, no function)
and its trigger is the very next step the design calls for — implementing the `P` capability. An
implementer who trusts `:621-629` ships a content writer with no business- or page-scope bound at
all.

**Three things the next reviewer should refuse**, recorded because a forward fix is where this gets
decided: (1) a permissive policy naming `app_command` that carries no scope predicate of its own and
relies on the existing narrowings; (2) closing S1 by granting `app_command` `BYPASSRLS`, dropping
FORCE, or making it a table owner — RFC-2026-017 §4 names that temptation; (3) reading the fixture's
green as evidence that the `app_command` path works.

**Tenant isolation and deny-by-default on all five tables, for `authenticated`: no open path
found**, including both halves of all five restrictive narrowings and the child-through-parent
resolution. **That qualifier is load-bearing and is S8:** the narrowings hold for the only role they
name, and the writer this family is designed around is not that role.

This review is a second reading by the author's own vendor and model family. It is not the
independent Security/Privacy signature RFC-2026-002 requires, and PR #112 still lacks that
signature.
