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

`seeds/fixture-catalog.json` fixes the fourteen identities §12.6 names. Every UUID is
`uuid5(namespace, 'thinkbizthai.fixture.' || symbol)` — a pure function of the symbol, so anyone can
recompute them and nobody has to trust the file. A test recomputes all fourteen on every run.

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
