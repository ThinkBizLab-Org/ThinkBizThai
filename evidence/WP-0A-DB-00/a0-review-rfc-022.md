# A0 review of RFC-2026-022

Reviewer: `/claude/a0_atlas` (A0). Author under review: `/claude/a1_bastion` (A1 Security).
Date: 2026-09-08.
Subject: `architecture/decisions/RFC-2026-022-service-policy-shape.md` and its measurements at
`evidence/WP-0A-DB-00/a1-rfc-022-measurements-2026-09-08.md`.

## 1. Verdict

**Recommend disposition as proposed.** The decisive measurement was re-taken independently and
holds; one caveat the author surfaced is recorded in §4 as a blocker rather than left in a report.

## 2. What A0 re-measured rather than accepted

The RFC turns on one claim: **the role the policy names can set the setting the policy reads.** If
that is wrong, the workspace GUC is a boundary and §2 needed no amendment. Re-taken on the
provisioned instance, 2026-09-08, independently of the author's probe:

```sql
create or replace function pg_temp.probe() returns table(who text, first_set text, second_set text, may_set text)
language plpgsql as $$
begin
  set local role app_worker;
  who := current_user;
  first_set  := set_config('app.workspace_id','1111', true);
  second_set := set_config('app.workspace_id','2222', true);
  begin may_set := has_parameter_privilege(current_user,'app.workspace_id','SET')::text;
  exception when others then may_set := 'error: ' || sqlerrm; end;
  return next; reset role;
end $$;
select * from pg_temp.probe();
-- who: app_worker | first_set: 1111 | second_set: 2222 | may_set: false
```

Running **as `app_worker`**, the setting was written twice, to two different tenants, inside one
transaction — and `has_parameter_privilege` answers `false`, so the catalog cannot even be asked who
may set it. Both halves matter: the worker can move its own confinement, and no assertion can be
written against a privilege the catalog does not model.

I also confirmed the spelling the RFC pins: `nullif(current_setting('app.never_set', true), '')` is
`NULL` for a GUC that was never set, which is the only form that denies in both absence states
rather than raising and failing open into an error.

**This is a correction to the mechanism of an approved decision.** `RFC-2026-016` §2 scopes a service
policy by a server-set workspace GUC; measured, that scoping cannot bound the role it is written for.
The RFC keeps the term and reclassifies it — containment against defects in the service's own code,
never tenant isolation of the service path — and forbids any document or test from citing it as the
latter. That is the right handling: the mechanism survives, its stated strength does not, and the
record says which.

## 3. Where A0 pushed and the RFC held

**The carried/discovered test (§3).** The obvious objection is that a test keyed on the STATEMENT
rather than on the table is harder to apply. The RFC's answer is that asset hard purge is both, on
one table, so a table-keyed test would have to pick a side and be wrong for one of the two
statements. Agreed, and the classification is recorded in a file the lint reads in both directions
rather than in prose.

**Refusing the claimability-predicated policy** (`available_at <= now() and …`) on the queue. It
needs no new role, no function, and is pinnable today — and it contains **no tenant term at all**, so
no isolation case can tell a correct claim from one that returned another tenant's job. A control
that cannot fail on the thing it is for is the defect this repository keeps removing. The second
reason is stronger still: the predicate IS the lifecycle vocabulary `CTR-JOB-001`'s freeze reserves
to its owner, which batch `050` refused twice for that reason.

**A fifth role for the broker.** `RFC-2026-020` created `app_authz` on the argument that a function
owner is not a path and therefore is not one of §3's three service roles. `app_queue` is the same
argument one family over, and it keeps `app_worker` policy-free on the queue — which is what makes
batch `050`'s control keep working: a service role that quietly acquired `BYPASSRLS` would SUCCEED
where the suite demands a refusal, and that is only detectable while the role holds no policy.

## 4. The caveat A0 is recording rather than leaving in a report

The author surfaced it outside the RFC and it belongs in the record: **batch `050`'s
`service-sees-zero-*` cases become PERMANENT under this decision, not pending.** A later batch that
reads them as waiting-to-flip will "fix" them by writing the unscoped `USING (true)` policy this RFC
refuses. Recorded as an open blocker on `WP-0A-DB-00`, because the cases themselves do not say it and
the next author will read the cases before reading this file.

## 5. What A0 does not endorse

**Nothing in the decision.** Two dependencies are named rather than resolved and should stay that
way: `app_worker`'s connection method and credential custody (`RFC-2026-019` §4/3, due G1), and
`CTR-JOB-001`'s lifecycle vocabulary, which the broker's body needs and whose owner has not released.
Measured today, the only member of `app_worker` is `postgres`, which bypasses RLS — so this decision
can be **approved and still not be in effect**, and the RFC says so itself rather than being told.

The requested amendment to `roleScopedCompleteness` in `scripts/db/run.mjs` is A0's to make, is not
made here, and is not a condition of disposition.
