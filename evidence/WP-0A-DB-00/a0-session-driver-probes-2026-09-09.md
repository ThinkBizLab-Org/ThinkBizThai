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

---

# Addendum, 2026-09-10 — this file's §3 asked the wrong question, and the driver was wrong

An adversarial read of the session driver found two silent-false-pass paths and executed both. §3
above is not withdrawn — every reading in it stands — but it was **not the right set of questions**,
and saying so is the point of this addendum.

## What §3 got wrong by omission

§3 asked whether an error the SERVER raised is classified correctly: 42501 against 42P01 against
22012. It never asked whether **row data** can be classified as an error. It can, and it could:

    select 'ERROR:  42501: permission denied for table app.workspaces' as note
      -> { error: { code: '42501', ... } }

`expectDenied` accepts that. A case that should have returned rows reported a working RLS policy.
That is a false PASS, in the function whose whole job is to prevent false passes, and it was a
**regression**: under `--command`, "this is an error" came from a non-zero exit plus stderr, so
stdout content could not become an error by construction. Merging stderr into stdout — done to fix
ordering — is what created it.

The negative control could not have caught it either. It disables policies and requires the suite
to go red, which says nothing about a false pass driven by content.

Second defect, same class: the counted markers were counted at the instant the marker was **first
seen**, which on a forged value is the forgery, with the real `\echo` still in flight. On any result
spanning more than one flush the count read 1 and 1 and passed. The comment in the file claimed the
markers were ones "DATA CANNOT FORGE" and "strictly better" than `resultRegion`'s. Both were false,
and `resultRegion` — which read the complete stdout of an exited process — had refused exactly this
input in a test that already existed.

## What the rework changed, and why it is not a tighter regex

**The status is asked of psql rather than read from its output.** `:ERROR` and `:SQLSTATE` are psql
CLIENT variables set after each query; no row, column name or error text can write them. Measured:

| statement | psql's own report |
|---|---|
| `select 'ERROR:  42501: …' as note` | `false 00000` — no error |
| `select * from private.nope` | `true 42P01` |
| `select 1/0` | `true 22012` |

**Because the status no longer comes from the text, stderr is no longer merged.** stdout now carries
results and this driver's own `\echo` lines and nothing else. That retired a second defect the merge
had caused: psql's WARNING lines used to reach the CSV parser and become the header, making every
key garbage. Measured before and after:

    do $$ begin raise warning 'heads up'; end $$; select 7 as n;
      before -> {"rows":[{"WARNING:  01000: heads up":"n"}, …]}
      after  -> {"rows":[{"n":"7"}]}

**Markers carry a `randomUUID`, not a counter.** A counter is a pure function of the case list and
therefore predictable. The region is closed by waiting for the CLOSE marker, which psql prints
*after* the status line — so seeing CLOSE proves the status arrived. That is the structural fix for
the count-taken-too-early hole, rather than a wider count.

**The boundary logic is a pure exported function again.** `parseSessionOutcome` can be checked
against synthetic psql output with no database, which is the shape `resultRegion` had and the shape
the first version threw away. Five tests now cover it, including the forged-refusal value verbatim
and `rls-assertions.test.mjs`'s marker-forging case carried across. **The tests were shown to bite:**
reintroducing the stdout regex fails `a row value shaped like a privilege refusal is data, not an
error`, and removing it passes again.

## Three more defects the read found, all fixed

| | before | after |
|---|---|---|
| `session.close()` after the child had already exited | hung indefinitely — and the report is written *after* close, so a mid-run psql death gave a CI job that burned to timeout in silence | returns in 0 ms |
| an unterminated quote (psql swallows the trailing `\echo`) | hung indefinitely | times out and names the cause; measured 2503 ms at a 2500 ms budget |
| `inlineParams` substituting pass-by-pass over the already-substituted string | `['x$2y','B']` → `select 'x'B'y'` — the value left its own literal; `$10` → `'v1'0` | one regex pass over the original text; `'x$2y'` and `'TENTH'` |

The `inlineParams` defect predates the session and was **harmless under `--command`**, which does not
execute meta-commands mixed into a `-c` string. Writing to psql's stdin is what made it reachable,
and executed proof of the reachable form was `\echo PWNED` running.

## The suite and the control, re-measured on the reworked driver

| | result |
|---|---|
| `make db-rls-smoke` | 554 isolation case(s) passed, ok in 2070 ms, 28 psql invocations |
| negative control, `app.workspaces` | RED, 10 cases, first `owner-a-cannot-see-workspace-b` |
| negative control, `app.research_runs` | RED, 12 cases, first `editor-a-cannot-see-the-research-run-outside-their-narrowing` |
| negative control, `app.business_profiles` | RED, 13 cases, first `owner-a-cannot-see-business-b1` |
| negative control, `app.audit_logs` | RED, 2 cases, first `service-sees-zero-audit-logs` |
| `npm run check` | exit 0, 572 tests, 572 pass, 0 skipped |

Four of thirty-five control entries, not three. Still not all of them, and still on plain PostgreSQL
plus the shim rather than the platform — `RFC-2026-022` §7.3 (a)–(d) remain open by their own terms.

## What this addendum does not repair

The coupling to `runOne`'s `finally { rollback }` is still a sentence in a comment rather than a
control; `sessionDriver` now returns rollback's outcome instead of discarding it, which makes the
coupling observable but does not enforce it. And the safety of writing SQL to psql's stdin still
rests on psql's lexer not seeing a meta-command inside a quoted literal — measured true, pinned by
no test in this repository, because no test here can pin another program's lexer. What the tests now
pin is the escaping on our side, which is the half that was actually broken.
