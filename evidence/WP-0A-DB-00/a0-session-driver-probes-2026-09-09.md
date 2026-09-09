# One psql session — what a live database established, and what it did not

Run: `/claude/a0_atlas` (A0). Date: 2026-09-09.

Instance: **not** the provisioned Supabase instance. PostgreSQL 17.11 (Homebrew, aarch64-apple-darwin25.6.0)
on the author's machine, database `thinkbizthai_test`, with `db/foundation/ci/supabase-shim.sql`
applied first and then `make db-migrate-clean` through batch 140 — the same order and the same
shim CI uses, which is why these readings are comparable to a CI run and are **not** comparable to
the platform. The shim's own header says it is not Supabase; nothing below claims otherwise, and
`RFC-2026-022` §7.3's four claims stay open because they name the provisioned instance.

## 1. The defect, counted rather than described

`psql --command` exits between invocations, so a transaction cannot span two of them, so
`bufferedDriver` replayed a case from its first statement on every step. The cost was measured by
putting a counting wrapper ahead of `psql` on `PATH`:

| | invocations | wall |
|---|---|---|
| `bufferedDriver` (before) | **1,797** | 38,584ms |
| `sessionDriver` (after) | **28** | **955ms** |

1,797 for 554 cases is ~3.2 per case, so the unit was never the case — it was the `exec`. The 28
that remain are the helper install, the fixture loads and the authz proofs, which go through
`query` and are one statement each by nature.

40x on this machine. In CI the per-invocation cost is higher (~42ms against ~21ms here, container
networking against loopback), so the CI figure should be larger, not smaller — but that is a
prediction and this file does not record predictions as results.

## 2. The suite still goes RED — which is the only reason the 40x is worth anything

A faster suite that stopped detecting would be a worse suite. The negative control was run
locally, one table at a time, exactly as `.github/workflows/ci.yml` runs it:

| table disabled | outcome | cases noticed | first failing case |
|---|---|---|---|
| `app.workspaces` | went RED | 10 | `owner-a-cannot-see-workspace-b` |
| `app.research_runs` | went RED | 12 | `editor-a-cannot-see-the-research-run-outside-their-narrowing` |
| `app.business_profiles` | went RED | 13 | `owner-a-cannot-see-business-b1` |

Each first-failing case matches the pattern that table's control entry greps for, so the control's
own assertion — that the failure is about *that* table — holds under the new driver.

Three tables, not thirty-five. This establishes that the mechanism detects; it does not re-run the
whole control, which is CI's job.

## 3. The four properties that had to hold, each executed

Measured against the live instance by driving `openSession` directly.

**(a) A backslash on stdin is psql's, and was not on `--command`.** psql reads meta-commands from
stdin, so this is a surface the previous driver did not have. A parameter carrying
`before\n\q\nafter` round-tripped intact — `"before\n\\q\nafter"` — and a following
`select 1` answered, so the session was still alive: psql's lexer did not see a meta-command inside
a quoted literal. **This is now a property the driver depends on**, which is why
`foundation-contract.test.mjs` also pins the escaping to one function.

**(b) The SQLSTATE survives the stream merge.** stderr is merged into stdout in the shell so the
kernel orders it; the risk was that an error would then be unparseable or attributed to the wrong
statement. As `authenticated`:

| statement | code | message |
|---|---|---|
| `select * from private.meta_webhook_inbox` | **42501** | permission denied for schema private |
| `select * from app.no_such_table_here` | 42P01 | relation does not exist |
| `select 1/0` | 22012 | — |

A privilege refusal is still distinguishable from a typo and from a constraint failure. That
distinction is the whole of what `expectDenied` rests on.

**(c) Rows are still keyed by column name, and empty is still empty.**
`select 'x' as name, 2 as n` returned `[{"name":"x","n":"2"}]`; `select 1 as n where false`
returned `[]`. A header row reaching `classify` as one visible row is the defect that made 21 cases
pass for the wrong reason once already.

**(d) An aborted transaction recovers.** Inside a transaction, after a failing statement, the next
statement returned **25P02** and `rollback;` restored the session — the next `select` answered.
This is what makes `ON_ERROR_STOP=0` safe here, and it is safe **because** `runOne` rolls back in a
`finally` on every path. If that `finally` is ever removed, every case after the first refusal
fails at assume-identity with 25P02 — loudly, which is the right direction to fail in.

## 4. What this does NOT establish

- **Nothing about Supabase.** Plain PostgreSQL plus the shim. The platform roles, `auth.uid()` and
  the pooler are the shim's imitation of them, and `RFC-2026-022` §7.3 (a)–(d) remain open by their
  own terms: they name the provisioned instance and forbid a citation in place of a reading.
- **Nothing about the negative control at full width.** Three of thirty-five entries were run.
- **No claim that the 40x transfers.** The CI number is CI's to produce.
- **Nothing about tenant isolation that was not already true.** This increment changes what carries
  a statement to the server. It writes no policy and grants nothing, and the cases that pass are the
  same cases, passing for the same reasons — which §2 is the evidence for.

## 5. Local setup is not in the repository, and one thing it revealed

Reproducing CI locally needed a `postgres` superuser role (Homebrew names the superuser after the
OS user) and a database named `thinkbizthai_test`. That setup lives in the author's scratch space,
deliberately: it is not a declared command and shipping it would make a developer's cluster layout
part of the contract.

It did surface one real gap, recorded here rather than fixed because it is not this increment's
subject: **`make db-reset-test` drops the `app` and `private` schemas but not the ROLES**, and
`001_service_roles.sql` creates them unconditionally, so a second `make db-migrate-clean` on one
cluster fails at 001 with `role "app_worker" already exists (42710)`. CI never sees it because
every job gets a fresh container. Anyone running the live targets twice locally will.
