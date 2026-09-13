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

## Forward fix, never a downgrade

There is no `down` migration and there will not be one. A merged migration is never rewritten
(migration invariant 1); a mistake is corrected by a new batch that moves forward. To correct
batch `N`:

1. Write batch `N+1` with the correction and a comment naming what it corrects and why.
2. Prove the correction: a test that fails against `N` alone and passes with `N+1` applied.
3. Retake the catalog snapshot, since the migration set digest has changed.
4. Record the incident in the work package's `open_blockers` if anything is left unresolved.

The recovery path is tested before it is needed, not after.

## What this package deliberately does not contain

**No tenant table, and therefore no RLS policy.** Batch `010` belongs to A1 Identity, and proposing
another owner's migration is the irregularity this repository has already graded High twice. Batch
`000` holds the schemas, the extension set and the helpers; the first table is A1's to write.

The policy shape those tables will carry is settled — `RFC-2026-016`, approved — so A1 inherits a
correct shape rather than one that would have to be forward-fixed across twenty batches.
