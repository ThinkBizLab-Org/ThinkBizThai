# The fixtures and the auth-context helper are fed to psql on stdin too — the second half of #131

Run: `/claude/a0_atlas` (Author, A0 Integration). Date: 2026-09-15. Package `WP-0A-DB-00`. Owed
since the second-pass record §5: "the fixture loads still go through `--command` (a fixture over
131,072 bytes would meet the old ceiling; none is near it)".

## 1. What changed

- `scripts/db/psql-driver.mjs`: a `feed(sql)` path — stdin, **no** `begin/commit` wrapping. `script()`
  wraps because a migration is a bare statement list; a fixture carries its own transaction by its
  text and the helper install is a set of `CREATE OR REPLACE`, so wrapping either would nest a
  transaction inside one. That difference is why `feed` is a third export rather than `script` reused.
- `scripts/db/rls-smoke.mjs`: the helper install and every fixture load go through `feed`. Cases keep
  `--command`, which their fences rely on.
- `test-kits/db/foundation-contract.test.mjs`: one rule, `no fixture or test helper carries a psql
  meta-command, because the loader feeds them on stdin` — pins `feed` in the driver, both call sites
  in the loader, and that no line of any fixture or of `auth-context.sql` begins with a backslash.

## 2. Measured, scratch PostgreSQL 17.11 on `127.0.0.1:5499` (fresh cluster, full set through 111)

| Probe | Result |
|---|---|
| `migrate-clean` → `schema-lint` → `rls-smoke` with fixtures on stdin | `applied 111_social_fk.sql`; `ceiling probe: a 200024-byte script applied through stdin`; lint ok; **845 isolation case(s) passed** — the same 845 as CI run 34902972792 on `--command` |
| a 141,425-byte fixture-shaped script through `feed` | ok |
| the same script through `query` (`--command`) **on this Mac** | ok — macOS has no per-argument cap, so the old ceiling is not reproducible here; it is Linux's `MAX_ARG_STRLEN` (131,072), where CI runs, and #131's evidence is the record of it. This file does NOT claim a local refusal it did not see |
| `feed('begin;\n\! echo PWNED\nselect 1;\ncommit;')` | **ran**: psql executed the shell line and the rows came back headed `PWNED`. That is what the static rule is for; under `--command` a backslash line is a syntax error, on stdin it is a command |

Largest fixture today: `100-asset-fixture.sql`, 22,253 bytes; all eleven files plus the helper total
220,481 bytes — a single fixture five times the largest would still have been under the old cap.
The change is not a fix for a failure that happened; it removes a ceiling that CI, not this machine,
would have met first, and it closes the one door stdin opens.

## 3. Not changed

Cases still run under `--command`; a case is a few hundred bytes and its fences (`__A__`, `__SELF__`)
are substituted before invocation, so the argv path is the right one for them. The `feed` name is
deliberately not `script`: a reviewer who sees `feed(fixture)` should read "as written".

## 4. Cost

`npm run verify` 642 → 643 (one contract test). No migration, no grant, no policy, no case.
