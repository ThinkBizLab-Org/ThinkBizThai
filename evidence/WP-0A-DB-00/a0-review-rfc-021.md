# A0 review of RFC-2026-021

Reviewer: `/claude/a0_atlas` (A0). Author under review: `/claude/a1_bastion` (A1 Security).
Date: 2026-09-06.
Subject: `architecture/decisions/RFC-2026-021-client-read-allowlist.md` and its measurements at
`evidence/WP-0A-DB-00/a1-rfc-021-measurements-2026-09-06.md`.

## 1. Verdict

**Recommend disposition as proposed.** One point in §3 needs A0 to answer rather than the RFC, and it
is recorded in §4 below rather than resolved inside the decision.

## 2. What A0 re-measured rather than accepted

M3 decides the RFC and contradicts the stated reasoning of an approved decision, so it was measured
again independently on the same instance, 2026-09-06:

```sql
select has_table_privilege('authenticated','app.workspaces','SELECT'),
       has_table_privilege('app_worker','app.workspaces','SELECT'),
       (select count(*) from information_schema.columns
          where table_schema='app' and table_name='workspaces'),
       (select count(*) from information_schema.columns c
          where c.table_schema='app' and c.table_name='workspaces'
            and has_column_privilege('authenticated','app.workspaces',c.column_name,'SELECT'));
-- false | true | 7 | 7
```

`authenticated` holds `SELECT` on **seven of seven** columns and does **not** hold the table-wide
bit; `app_worker`, granted table-wide by `010`, does. So a column-scoped grant covering every current
column is not equivalent to a table grant, and **a column added later is unreadable rather than
silently readable**.

`RFC-2026-012` §2 gives "column drift is silent" as its reason for forbidding base-table client
reads. In the grant shape batch `010` already writes, that reason is **false** — drift is loud, and
the new column simply cannot be read.

A1 keeps decision 2 anyway, on the different argument that a view is a **named object an allowlist
can enumerate**, and states plainly that decision 2 therefore stands on less than it appears to.
That is the correct handling: the decision survives, its stated rationale does not, and the record
says which.

I also confirmed M7's shape: `pg_default_acl` has 24 rows and **none** for schema `app`.

## 3. Where A0 pushed and the RFC held

**Option C, which A0 expected to be the answer.** Serving the catalog through the server tier reads
like the honest minimal move, and the RFC's reply is that C is not a rival to B but what B *implies*
for this candidate — adopting C alone would settle one candidate and leave the growth rule
undefined, which is the state that produced this RFC. Agreed.

**`anon`, decided rather than deferred.** The measured reason is what makes it a decision rather
than a preference: opening `anon` is not one grant but `grant usage on schema app`, which is not
scoped to an entry. A per-entry mechanism cannot express it, so it cannot be smuggled in as one.

**The lint answer in §5.** Replacing a prohibition with a two-way conformance check — every view or
client grant has an entry, every entry has objects — is the same shape as the exemption register and
for the same reason: a rule whose whole content is "never" cannot later express "only these".
`030`'s text-scanning test is superseded by one that reads ACLs, which M7 shows is necessary: a
`CREATE VIEW` in `public` is self-granting through `pg_default_acl` with no `GRANT` in any migration
text for a text scan to find.

## 4. The one point A0 must answer, and does not answer inside the RFC

§3 places the batch that would create the first entry at `031`. **There is no `031` row in the
migration registry.** The registry's row for `170` is *"A1 Security | all | grants/RLS/exposed
surface hardening"*, and the "Shared-file writer" column on every row makes batch assignment A0's
act.

So: the batch that creates the first allowlist entry **is not yet assigned**, and assigning it is a
registry change A0 makes when a candidate passes C1–C7 — not something this RFC settles and not
something a reading of `170` can supply. Since the RFC adds no entry, nothing depends on the answer
today. Recorded as an open blocker rather than confirmed, because confirming `031` here would create
a batch number by citation.

## 5. What A0 does not endorse

Nothing. The two claims requiring `CREATE VIEW` — that a `security_invoker` view over a
FORCE-RLS table with no policy returns zero rows, and that the same view without the option returns
everything — are correctly written as execution-discharged in the shape `RFC-2026-020` §6.2
established, and owed by the batch landing the first entry rather than by this RFC.
