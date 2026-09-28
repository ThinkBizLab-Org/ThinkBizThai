# DB-00 — schema foundation and test harness

Batch `000`, the deterministic command contract, and the lint that stands over both.

## What you need before anything here runs

- **Node 24** and the npm version `RFC-2026-001` pins. `node scripts/verify-toolchain.mjs` says
  yes or no; nothing else in this directory needs installing, because the repository declares no
  dependency and a test forbids adding one.
- **A Postgres test instance**, for the six targets that need one. Point `DB_TEST_URL` at it.
  It must not be a production database: `db-reset-test` exists to destroy and recreate, and it
  refuses any host or database outside an explicit test allowlist.

Without `DB_TEST_URL`, three targets still do real work and six refuse. That is the design, not a
limitation to work around — see *Exit codes* below.

## Commands

Every target sets `LC_ALL=C` and `TZ=UTC` itself, so a caller's locale cannot change a result.

| target | needs a database | what it decides |
|---|---|---|
| `make db-schema-lint` | no | the migration text, **and** the live catalog through the committed snapshot |
| `make db-contract-check` | no | every target §12.5 names is reachable |
| `make db-generated-drift-check` | no | nothing is generated yet, so nothing can have drifted |
| `make db-reset-test` | **yes** | drops and recreates the test database |
| `make db-migrate-clean` | **yes** | batch `000` onward against an empty database |
| `make db-migrate-upgrade FIXTURE=previous-release` | **yes** | the upgrade path from a prior release |
| `make db-seed-replay` | **yes** | the global seed is idempotent — same counts, no duplicates |
| `make db-rls-smoke` | **yes** | the cross-tenant assertions §12.6 lists |
| `make db-test-foundation` | **yes** | the foundation suite |
| `make db-verify` | partly | every target above, in order, with a readable failure summary |

```bash
LC_ALL=C TZ=UTC make db-verify
```

## Exit codes, and what a failure means

`0` only when every target it ran passed. Anything else is a failure, and the summary names which
targets and why.

**A target that cannot do its job exits non-zero.** It never reports a pass it did not earn. With
no `DB_TEST_URL`, `db-verify` fails and says so:

```
db-verify: FAILED — 6 of 9 target(s): reset-test, migrate-clean, migrate-upgrade,
  seed-replay, rls-smoke, test-foundation
  6 of them need DB_TEST_URL, which is unset.
```

That is the correct output on a machine with no database. A harness that printed `ok` there would
be lying on the one surface where a false pass means tenant data reaching the wrong tenant.

Connection strings are redacted from every line of output, and a test asserts it with a URL
carrying a password.

## The catalog snapshot

`lint/catalog-snapshot.json` is what the database actually **became**, read from the provisioned
instance. The text lint reads migration files; a file saying `force row level security` means
somebody wrote it, while `relforcerowsecurity` in the catalog means the database is in that state.
A migration that failed halfway, a later one that undid it, or a statement run by hand in the
dashboard breaks the first without touching the second.

The snapshot names the migration set it was taken against. **Change a migration without retaking
it and the lint fails**, before it reads the contents — so a stale file can never report a clean
database.

To retake it after a migration changes: read the catalog on the test instance and rewrite the file,
including a fresh `taken_against_migrations`. The lint tells you the digest it expected.

## Fixtures

`seeds/fixture-catalog.json` fixes the fourteen identities §12.6 names **plus the ones a batch had to
add and declared**. **THE NUMBER OF ADDITIONS IS DELIBERATELY NOT WRITTEN HERE ANY MORE, AND THAT IS
THE FOURTH CORRECTION TO THIS SENTENCE RATHER THAN THE THIRD.** It said "fourteen" flat and was wrong
from batch `020` onward; it said "seven more" and was wrong the moment `040` landed; it said
"thirteen more" and was wrong the moment `060` did; it said "FOURTEEN more as of batch `060`" and was
wrong the moment `051`, `061`, `110` and `131` did, because four batches written in parallel each
added symbols without seeing the others. A count in prose is edited by whoever notices, and the
batches that do not notice are the ones that make it false — which is the same defect this repository
has now recorded about a test count, a floor, an ordinal and a list of batch numbers in
`tests/db/identity/run-isolation.mjs`. **The list lives in `ADDED_SYMBOLS` in
`test-kits/db/foundation-contract.test.mjs`, each entry naming the batch that needed it and the case
it exists for, and the closed-set assertion below is over §12.6's list plus exactly that.** Read it
there; it cannot fall behind, because a symbol that is not in it fails the build. Every UUID is
`uuid5(namespace, 'thinkbizthai.fixture.' || symbol)` — a pure function of the symbol, so anyone can
recompute them and nobody has to trust the file. A test recomputes **all** of them on every run and
holds the catalog to exactly §12.6's list plus the declared additions, each of which names the batch
that needed it and the case it exists for.

Batch `030` added the first symbols that belong to **no tenant** — a global industry pack and two of
its published versions — and they carry no `_a` or `_b` suffix for that reason: every other symbol
here ends in the workspace its row lives in.

Batch `040` added six, which is more than any batch before it, and the reason is a property of the
schema rather than an appetite. A version row is addressed by its parent and its ordinal, a member
scope by its member and its target, an industry assignment by the Business it belongs to — every one
of those is a natural key some document fixes, so none of them needed a symbol. **A knowledge item
has none.** Nothing in §4, §5 or §8 says a Business holds one voice profile, so inventing a
`unique (business_profile_id, kind)` in order to address a row without a symbol would be writing a
product decision into a constraint to save five constants. The sixth is `page_a1_archived`, an
archived Page under a **live** Business: `040`'s knowledge INSERT policy carries §11.3's archive
clause twice — once per parent — and `business_a3_archived` can only ever exercise the first.

Batch `060` added **one**, which is fewer than any batch since `020`, and the arithmetic is the rule
rather than restraint. Its model policy is addressed by the Workspace it belongs to — `workspace_id`
**is** its primary key — and so is its credential reference, so both are reached through ids this
file already fixes. A **global** curated model has no such natural key, which is exactly why `030`'s
pack needed a symbol: a catalog no case can address is a catalog no case can be about. That symbol's
`model_key` is deliberately synthetic, because `OPEN-004` owns the BYOK model allowlist, it is open,
and §15 forbids an agent choosing an open decision — a fixture naming a real model would read as one
having been chosen.

Batch `070` added symbols for rows in four of its five tables and **none for the fifth**, which is
the rule this list has applied since `020` arriving at a table where it points the other way. A run,
a citation, an evidence item and a suggestion have no natural key any document fixes, and `070`
refused to invent one for each — nothing in §4, §5 or §8 says a run cites a URL once or that a source
supports one piece of evidence — so each is addressed by an id fixed here. A **research snapshot**
has a natural key: `(workspace_id, research_source_id, content_hash)`, because that triple is what
`app.research_evidence.snapshot_content_hash` has to name single-valued once §10's purge has removed
the locator. So a case addresses a capture by its DIGEST, exactly as `010`'s cases address an
invitation by its token hash, and the fixture composes the same digest from the same synthetic
string — which is a demonstration that the hash IS an address, and that is the whole reason §10 says
to preserve it. The string is this repository's own: §9.2 names `fixture` among the surfaces a full
research snapshot may not reach.

Batch `080` added symbols for rows in **three of its five tables**, and three of those symbols are
the first in this catalog added for a row that ALREADY HAS a natural key — which is worth the paragraph,
because the rule has run the other way since `020`. A content item and a quality review have no
natural key any document fixes, so each is addressed by an id fixed here. An **idea** is addressed by
`(workspace_id, client_request_id)`, which §4.6 makes unique per workspace; a **variant** by
`(content_version_id, platform)`; and a **version** by `(content_item_id, version_no)` — all natural
keys, all spelled out of ids this catalog already fixes. Three versions carry a symbol
anyway, and not in order to address themselves: a variant and a quality review are addressed THROUGH
a version id, and a case that resolved that id by joining `app.content_versions` would put two
tables' policies behind one result and could not attribute the refusal it observed to the table the
case is named for. The symbol is the cheaper of the two costs.

Batch `081` added **no symbol for a row in its one table and three for a column of one**, which is
the first inversion of that rule in this catalog and the reason it gets its own paragraph. A
**content target** has a natural key — `(content_item_id, social_account_id)`, which
`081_content_targets.sql` makes unique among rows whose `deleted_at` is null, §4.6's "unique active
target" — so every case addresses one out of ids already fixed here. Its **destination** is the
opposite case and the opposite case is the whole point of the batch: `social_account_id` carries no
foreign key, because §6's registry gives "business-channel/social FK" to batch `111`, and
`app.social_accounts` fixes no id of its own, so the value is a bare uuid resolved against nothing,
reachable through no other table's natural key, and shared between a fixture and a case. That is
exactly the constant this catalog exists to fix — and fixing it is also what keeps the gap visible,
because three ids that name no row are the first thing a reader meets. **Batch `111` must repoint all
three, and the fixture will refuse to load until it does.** That failure is intended: a fixture that
kept loading through the addition of a foreign key is one whose rows never depended on it.

Batch `111` did exactly that. The three destination symbols are retired; `social_account_a1`,
`social_account_a2` and `social_account_b1` name rows `110`'s fixture now loads with fixed ids (and a
second `workspace_a` account, so one item can hold two destinations); `081`'s fixture and every case
point at them; and `content_targets_social_scope_fk` is what makes a destination that does not
exist, or belongs to another tenant, fail to load or to insert — `editor-a-cannot-aim-a-content-
target-at-another-tenants-destination` is the case, refused with 23503 (not `…-social-account`:
that word is batch `110`'s control pattern, and a case id may not satisfy another family's entry).

**The key carries no ON DELETE action, by decision.** The Owner answered the question batch `111`
left open (2026-09-15, `product-owner-disposition-2026-09-15-rfcs-and-pii-filename.md` §5): a social
account row is never hard-deleted except by workspace closure — disconnection is a *status* — so
there is nothing for the key to cascade, null or restrict, and NO ACTION is the correct answer
rather than a default. CASCADE was refused because it would delete the publishing history `081`
preserved on purpose; SET NULL because `social_account_id` is NOT NULL and the target's natural key.
A batch that wants to hard-delete an account must first change that decision, in writing.
Batch `090` added symbols for rows in **one of its three tables**, which is the smallest share any
multi-table batch has claimed, and the split falls exactly where this catalog's rule puts it. An
**approval policy** is addressed by `(workspace_id, business_profile_id, policy_key, version)` —
§5's "policy versioned" as a constraint, on a table whose rows ARE versions. An **approval event**
is addressed by `(approval_request_id, action, idempotency_key)`, and that one is worth more than a
symbol rather than less: §4.7 asks for a "unique idempotency key ต่อ action", so using the key AS
the address is a demonstration that the key identifies an action, which is the whole reason the
document asks for one. It is the third shape of natural-key addressing in this suite, after `010`'s
token digest and `070`'s content hash.

An **approval request** gets a symbol because it has no natural key at all. Nothing in §4.7, §5 or
§8.3 says a content version is requested once — a rejected version is revised and re-requested, and
§4 invariant 6's "Version ใหม่ไม่ inherit approval โดยอัตโนมัติ" describes a table that ACCUMULATES
requests rather than one that replaces them. Inventing a `unique (content_version_id)` so the
fixture could address one without a constant would encode a product decision into a constraint,
which is the rule this catalog has applied since `040`'s knowledge item. The fixture's
`approval_request_a1_decided` is the demonstration: a second request on a version that already has
one.
Batch `100` added symbols for rows in **three of its four tables** and none for the fourth, and the
one it refused is the clearest case this catalog has. A **content asset link** is addressed by
§4.7's own logical key — `(content_version_id, content_variant_id, role, sort_order)` — which
`100_asset.sql` declares `unique nulls not distinct`, so a link with no variant is single-valued
under `(content version, role, sort_order)`. That the address works is itself evidence for the
declaration: under Postgres's default the same link could be loaded twice and the fixture's
`on conflict` would silently stop protecting anything. An **asset** and a **rights record** have no
natural key any document fixes — §2.2's ERD draws `ASSETS ||--o{ ASSET_RIGHTS`, so a Business may
hold several rights over one asset — and inventing a uniqueness so a case could address one without
a constant would be writing a product decision into a constraint. Four **versions** carry a symbol
despite having one, for batch `080`'s reason one family over: a link is addressed THROUGH an
`asset_version_id`. One of the four buys something no earlier symbol has — it is the **purged** row,
whose locator is gone and whose digest remains, so the two constraints that describe §10's redaction
are satisfied in the interesting direction by a row rather than only in the vacuous one.

Tests must read ids from here and never generate them. The cross-tenant assertion depends on it:
proving tenant A cannot reach tenant B **by guessing** is worthless; proving it cannot while holding
B's exact id is the control that matters.

## The publisher, and the one thing it cannot do

Batch `120` lands `publisher.meta` — the intent a person raises, the sends it fans out to, the asset
versions each send carries, the job that talks to the provider and the record of the publication —
and `122` closes the service path on the two of those five tables that are not `S` cells. The Product
Owner's fourteen answers of 2026-09-15 are transcribed in
`evidence/WP-0A-DB-00/product-owner-disposition-2026-09-15-batch-120.md`; the plan they answer is
`a0-batch-120-plan-2026-09-15.md`.

**§8.3 gives this family two rows and they do not fall one per table.** "Publish now/cancel pending"
is the INTENT: `Y` for the owner and the admin, `P` for the editor with no capability defined
anywhere, `N` for the approver and the viewer. "Publish delivery/post/metric INSERT" is everything
below it: `N` in every client column and `S` for the service. So one table in five is client-writable,
and the other four are refused to every client role at the GRANT layer — which is why
`owner-a-cannot-fan-out-a-publish-target` is worth reading: the person who asked for the publication
may not write the delivery record for it.

**The `S` cell is classified and not enforced.** `RFC-2026-022` is approved and NOT IN EFFECT, so the
three statements it names — the target, the job, the post — get rows in
`db/foundation/lint/service-policy-map.json` marked CARRIED and no policy at all. `app_worker` holds
the grants and no policy, which is batch `010`'s shape and the reason the four `service-cannot-…`
INSERT cases are refused at the POLICY layer and FLIP when the negative control disables row level
security. The worker's column-scoped UPDATE on a send's outcome and a job's attempt summary is the
Owner's decision rather than a matrix cell (question 10), and it never includes a cancellation:
that is a person's verb and lives on the intent's `cancelled_at`.

**A provider's post identifier is stored as a digest and the raw value is stored nowhere.** §9.1
classes it `PROVIDER-3` — "private, redact/log hash", client projection "safe projection only" — so
`app.published_posts` carries `external_post_hash`, exactly one sha256, and no permalink, because a
permalink embeds the identifier. Batch `110` refused the same value a home for the external ACCOUNT
identifier and named batch `120` as the batch that would have to answer. **It does not answer; it
defers, in writing**, because the mechanism §9.3 would need has no decision behind it and the typed
service still does not exist — and the consequence is stated rather than absorbed: nothing can
address a Page at the provider until that debt is paid.

**And the measurement that says the same thing from the other side.** Asked of a live PostgreSQL
17.11 while the cases were being written: `app_worker` is refused `app.content_targets` and
`app.content_variants` outright. A send COPIES an aim and a variant from those two tables, so the
statement `RFC-2026-022` §3 calls CARRIED cannot be composed by the identity the cell names — the
server must resolve both ids first, which is exactly what CARRIED means. That is why the four
fan-out cases hold their aim and their variant as PARAMETERS, and why batch `120` fixes the ids of
batch `081`'s six content targets: a subselect there would have run as `app_worker` and been refused
on the wrong table at the wrong layer, and the case would have passed while proving nothing. It is
in the work package's open blockers.

## Forward fix, never a downgrade

There is no `down` migration and there will not be one. A merged migration is never rewritten
(migration invariant 1); a mistake is corrected by a new batch that moves forward. To correct
batch `N`:

1. Write batch `N+1` with the correction and a comment naming what it corrects and why.
2. Prove the correction: a test that fails against `N` alone and passes with `N+1` applied.
3. Retake the catalog snapshot, since the migration set digest has changed.
4. Record the incident in the work package's `open_blockers` if anything is left unresolved.

The recovery path is tested before it is needed, not after.

## The post-migrate assertion pass, and what a later batch owes an earlier one

Most batches end with a `do $$` block that asserts what they built. Files 000–003 and 010 have
none, and two blocks (011#1 and 131#1) are idempotent guards that create rather than assert.
`make db-migrate-clean` re-runs
**every** such block from every migration after the whole set has applied, each one in its own
transaction, which is rolled back. So a later file cannot silently undo an earlier batch's
guarantee. On 2026-09-27, before this pass existed, a later file dropping 061's
`usage_events_dimension_known` left `rls-smoke` green. It now fails `migrate-clean` and names the
block.

Write every block as a line that is exactly `do $$` through a line that is exactly `end $$;`. A
block written any other way is refused, because the pass could not extract it. That includes
`do language plpgsql $$`, a `do` with its `$$` on the next line, and a block opened mid-line. The
first version missed all three (C0 and Q0 found them).

**If your batch legitimately makes an earlier block false** (a new restrictive policy on its
table, a key it said would come later, one more closure of a counted shape), `migrate-clean` fails
and names that block. Do not edit the earlier migration. Do all of the following in the same
change:

1. Add an entry to [`invariants/superseded.json`](invariants/superseded.json) naming the block
   (`file#ordinal`), your file under `superseded_by`, and a replacement.
2. Write the replacement in `invariants/`: the original block **word for word**, except where your
   batch changed it. Each changed line carries a `SUPERSEDED BY nnn` comment naming your file, and
   a comment at the top of the block lists every name your file added. Exclude what your file added
   as **(table, name) pairs**, never as bare names: a name excluded everywhere lets the same name
   onto another table unchecked (C0 measured that, on 120's replacement).
3. Restate the change in final-state form, pinning the new set by name so that anything beyond it
   still fails. Do not delete the assertion.

If the block is already superseded, edit its existing replacement and add your file to
`superseded_by`.

The register keeps itself honest in three ways:

- A registered block must still fail as written, with its own raise (`P0001`). Otherwise the entry
  is stale and the pass fails.
- Its replacement must pass.
- A test holds every block in the plan exactly once.

A replacement must be additive. Every line of the original block stays in it, in order, and a test
enforces that. It must also be exactly one block, with no line starting with a backslash, and
`migrate-clean` refuses it otherwise.

**A register diff is a security diff.** Adding an exclusion to a predicate relaxes an assertion, and
no mechanical rule can tell a legitimate relaxation from one that hides a regression. A1 measured
this: a later file dropped FORCE ROW LEVEL SECURITY on a table, and three register edits made every
layer green. So when an entry or a replacement relaxes anything about RLS, policies, grants, role
attributes or tenant keys, it goes to the Security reviewer as well as the Reviewer. The Author says
so in the handoff.

What the pass cannot do is make a block stronger. A block that asserts a constraint **exists by
name** still misses a change to what the constraint **says**.

## The catalog-rule probes, and what a new batch must keep true

After the ceiling probe, `make db-migrate-clean` asserts six families of rules over all of `app` and
`private`, in eleven probes. The first is the FK-support probe (batch 104): every foreign key has a
supporting index, and each of its four exemptions names a key that exists. The other five are
numbered below. Each rule is enforced by a probe in `scripts/db/run.mjs`, so a later file cannot
break it silently:

1. **Every foreign key has NO ACTION on delete and on update, and is not deferrable.** A key that
   needs an action is named in `FK_ACTION_EXEMPTIONS` with its reason, in the same change. **An
   exemption that lets a delete cascade through tenant data is the "irreversible deletion"
   stop-the-line class.** It goes to the Security reviewer and the Product Owner, not only the
   Reviewer (A1's review of the probes, F6).
2. **Every `*_updated_by_is_caller` and `*_requester_is_caller` policy matches its exact pinned
   text:** restrictive, INSERT, TO authenticated, no USING, and a WITH CHECK that deparses to the
   pinned string, on the pinned tables. So is every `*_updated_by_on_update_is_caller` policy
   (batches 105 and 123: restrictive, UPDATE, TO authenticated, no USING), on all seventeen tables
   that grant `authenticated` UPDATE on `updated_by`. A batch that adds a closure adds its table to
   `UPDATED_BY_CLOSURES`, `REQUESTER_CLOSURES` or `UPDATED_BY_ON_UPDATE_CLOSURES`. **An `app` table that
   grants UPDATE on `updated_by` without the closure fails twice:** once in the probe, which reads
   the grant live, and once in batch 123's block, which requires the exact closure. Both read schema `app`
   and role `authenticated` only: a table in `public`, or a policy for another role, is seen by neither
   (A1's review of batch 123, F6; recorded as owed).

   105's first general rule only checked that some policy *contained* the binding, so a looser
   permissive sibling could reopen the forgery. 123 closed that: a restrictive policy ANDs with
   whatever admits the row. `created_by` at INSERT is still bound only inside permissive policies;
   that gap is recorded as a blocker.

   **Who decided an approval request is held the same way.** `approval_requests_decided_by_on_update_is_caller`
   (batch 123) is restrictive, UPDATE, TO authenticated: `decided_by` is NULL or the caller, and its text
   is pinned in `DECIDER_CLOSURES`. The two CHECKs that make a cancelled, pending or expired request
   name no decider, 090's `approval_requests_decision_has_a_decider` and 123's
   `approval_requests_decider_is_a_pair`, are pinned by definition text in `PINNED_CHECKS`. A batch
   that changes any of them updates the pin in the same change.

   **A settled request cannot be touched by a client, and its time is the database's (batch 125).**
   `approval_requests_settled_is_immutable` is restrictive, UPDATE, TO authenticated, with
   `USING (status = 'pending') WITH CHECK (true)`. It is pinned in `PINNED_POLICIES`, because
   `closureRule` requires no USING. The WITH CHECK is `true` on purpose: with USING alone, the new row
   would have to be pending too, and every cancel and decide would be refused. The invoker trigger
   `private.set_decided_at()` sets `decided_at` to `now()` when `decided_by` is first set, whatever
   the client sent. It refuses any later change to either column, for every writer that fires
   triggers. For a writer that is not a client, the trigger does not freeze the request's OUTCOME
   (`status`), and it does not cover INSERT. Both are owed (A1's review of batch 125, V1). 125's own
   block pins the trigger's definition and the md5 of the function body.
3. **Every client-updatable `*_by` column has a pinned closure for its column:** `updated_by` in
   `UPDATED_BY_ON_UPDATE_CLOSURES`, `decided_by` in `DECIDER_CLOSURES`. A new attribution column that
   clients can update fails the coverage probe by name, until the batch that grants it adds its
   closure and its list.
4. **SECURITY DEFINER functions, in every schema except the system ones, are exactly the pinned
   list in `SECURITY_DEFINER_FUNCTIONS`.** Each one has its pinned owner and body digest,
   `search_path=""` and nothing else in `proconfig`, and no EXECUTE for PUBLIC. A batch that adds
   or rewrites one updates the list in the same change, so every SECURITY DEFINER change reaches a
   reviewer.
5. **Every trigger on a table in `app` and `private` is enabled**, including the internal triggers
   that enforce foreign keys. The `private.refuse_mutation` triggers are exactly four pinned
   `pg_get_triggerdef` definitions on `audit_logs` and `security_events`, so a `WHEN` clause or an
   `UPDATE OF` list fails too. Neither table may be partitioned, have a child table, or inherit from
   another table.

**Every catalog-rule probe's rules are shown able to fail on every run.** Each probe carries one
self-test drift per rule
(`selfTests` in `CATALOG_RULE_PROBES`). The probe must pass on the database as built, and after each
drift it must fail with that rule's own raise, in a transaction that is rolled back. A static test
holds the number of drifts equal to the number of raises, so a rule added without its drift fails
the suite. A rule no drift reaches runs live and is never shown able to fire. Q0's test of batch 123 (F3) found
two such rules in the closure probe, and applying the same check to every probe found six more.

After every drift has run, each probe runs **as built again**, so a drift that outlived its rollback
fails the target. A drift may not contain transaction control (`begin`, `commit`, `rollback`, `end`,
`savepoint`, `release`, `abort`, `start transaction`, `prepare transaction`). The contract test
derives the whole job list independently and compares it with `catalogProbeJobs`. It drives the
verdict with outcomes built from the real probes, and it counts every spelling of `raise`. Each claim
line counts the drifts that were refused, not the drifts declared (Q0's re-test of batch 123's
corrections, F1–F3).

Rules 2 and 5 compare PostgreSQL's deparsed text. A change of the Postgres major version in CI could
change that text without the policy changing. If that happens, the probe fails by name, and the
fix is to re-measure the text, not to loosen the rule.

## What this package deliberately does not contain

**No tenant table, and therefore no RLS policy.** Batch `010` belongs to A1 Identity, and proposing
another owner's migration is the irregularity this repository has already graded High twice. Batch
`000` holds the schemas, the extension set and the helpers; the first table is A1's to write.

The policy shape those tables will carry is settled — `RFC-2026-016`, approved — so A1 inherits a
correct shape rather than one that would have to be forward-fixed across twenty batches.
