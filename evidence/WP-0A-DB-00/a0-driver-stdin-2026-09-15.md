# The driver feeds a script on stdin — the ~128 KiB ceiling on a migration is gone

Run: `/claude/a0_atlas` (Author). Date: 2026-09-15. Closes batch 100's blocker 12 ("every migration is capped at ~128 KiB by the driver") and A0's blocker on `131_billing_projection.sql`'s 613-byte margin.

## 1. The change

- `scripts/db/psql-driver.mjs`: `invoke` takes `viaStdin`; `runWithInput` spawns psql with the same flags and writes the script to its stdin; `script()` — migrations and `reset-test` — passes `viaStdin: true`. `query()`, the case path and the fixture loads keep `--command`: the case fences rely on the whole-string-as-one-request semantics, and `rls-smoke.mjs:54` records why a fixture must not be parsed by psql.
- `scripts/db/run.mjs`: `db-migrate-clean` applies `CEILING_PROBE_SQL` — one empty `DO` block and a 200,000-byte comment — after the real set, and fails if it does not apply. The claim "the ceiling is gone" is proven on every run, in the CI log, not in a comment.
- `test-kits/db/foundation-contract.test.mjs`: batch 100's byte-budget rule (`MAX_ARG_STRLEN`, `MIGRATION_BYTE_BUDGET`, the 070 grandfather) is replaced by one rule that pins the stdin path in the driver, the probe in the target, the probe's size and no-op shape, and **that no migration line begins with a backslash** — the one thing stdin executes (`\!` runs a shell command) that `--command` refused as syntax.

## 2. Measured on the scratch PostgreSQL 17.11 (fresh cluster)

| Command | Result |
|---|---|
| `migrate-clean` | ok — every batch applied through stdin, then `ceiling probe: a 200024-byte script applied through stdin` |
| `schema-lint` | ok |
| `rls-smoke` | `837 isolation case(s) passed.` — unchanged |
| `reset-test` | ok |
| error classification through stdin | `select 1/0` → `{code: "22012"}`; a missing relation → `{code: "42P01"}`; SQLSTATE parsing is the same code path |
| a meta-command on stdin | `\! echo …` was executed by psql (stdout, not CSV) — the rule's premise, measured |

## 3. Probes — 2 run, 2 noticed

| # | Reversal | Noticed by |
|---|---|---|
| 1 | `script()` reverted to `--command` | `a migration may exceed the old argv ceiling, and none may carry a psql meta-command` |
| 2 | `\! echo pwned` appended to a migration | same |

## 4. Not done

`--command` remains for cases and fixtures by design; a fixture larger than 131,072 bytes would meet the old ceiling. None is near it (the largest is under 20 KB). If one ever is, the fixture loader gets the same treatment with the same meta-command rule.
