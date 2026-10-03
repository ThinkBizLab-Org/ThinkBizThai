# Q0 independent test: batch 128 (PR #167)

- **Package:** `WP-0A-DB-00`. **Role run:** `/claude/q0_sentinel` (independent Tester).
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-128`, head
  `b8435faf7f0d339ce101ceefccb49b3770679c8a` over code `d777d29`, base `18f1469` (main).
  Author `/claude/a0_atlas`. PR <https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/167>.
- **Checked out** the head into my own branch `review/q0-batch-128` in a worktree, and ran the live
  database layers on a byte-for-byte clone at that head, in my private dir.
- This file **records findings and advances no status.**

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author of this batch — the same vendor and model family as the
Author, the Reviewer (`/claude/c0_contract_reviewer`) and the Security reviewer (`/claude/a1_bastion`).
RFC-2026-024 governs what that means: my acceptance is not a role's signature. **Acceptance of this
package as test-verified is the Integration Owner's and Product Owner's act, not mine.** I report what I
measured and what I only read; graded findings with file:line and remedies; and a stop-the-line verdict.
I approve nothing and I fixed nothing.

**Measured vs read.** Everything in §2–§4 I ran myself on a fresh PostgreSQL 17.11 cluster
(`initdb --locale=C -A trust -U postgres`, 127.0.0.1:5503 TCP only, `unix_socket_directories=''`,
`LC_ALL=C`, shim first), Node `v24.20.0` checked before every measured run, re-initdb every round,
`140_audit.sql` saved first and restored byte for byte after every drift (sha1 `2ac2fc2c592b…`, confirmed
by `cmp` at the end). What I only **read** is called out as read: the handoff ratchet on the Author's
branch (topology I cannot reproduce from a review branch — see §6) and the disposition's account of the
#166 merge.

## 1. Baseline, re-measured on this head

| Command | Exit | Result |
|---|---|---|
| full suite `node scripts/run-test-suite.mjs` | 0 | **tests 677, pass 677, fail 0** |
| static (`foundation-contract` + `identity-isolation`) | 0 | 378 tests, 378 pass |
| `make db-migrate-clean` (ceiling + 23 catalog probes) | 0 | all probes clean, each refusing its self-test drift |
| `make db-rls-smoke` | 0 | **1079** isolation cases |
| `make db-schema-lint`, `db-authz-proofs` | 0, 0 | clean |
| `verify-branch-scope.mjs 18f1469 WP-0A-DB-00` | 0 | all 12 changed paths declared |
| `verify-test-coverage-floor`, `scan-repository-secrets`, `validate-work-packages`, `validate-work-package-ownership`, `validate-work-package-role-separation WP-0A-DB-00.json` | 0 each | clean |
| suite-contract floor 494 / role separation (A0, C0, Q0, A1, R0 distinct) | 0 | satisfied |

The counts A0 reports (677 tests, 1079 cases, 494 floor, 23 catalog probes) reproduce exactly.

## 2. The 127 re-check exploits, re-run on batch 128 (per layer)

Each is the drift that passed every layer at the 127 re-check. static = `node --test` on the two suites
with the drift in place; sl = schema-lint; mc = migrate-clean; rs = rls-smoke.

| Drift (127 finding) | static | sl | mc | rs | Verdict on 128 |
|---|---|---|---|---|---|
| R0 `grant postgres to authenticated` (N2) | 0 | 0 | **2** | 0 | Held by mc: membership probe names `authenticated -> app_authz, app_command, app_maintenance, app_worker, [redacted]`. |
| R1r TRUNCATE via a role granted to authenticated (N2) | 0 | 0 | **2** | 0 | Held: `authenticated -> q0_t`. |
| F1r view granted to `q0_r`, `grant q0_r to authenticated` (N2) | 1 | 2 | **2** | 0 | Held: membership probe `authenticated -> q0_r` (the SET ROLE path the privilege rules missed). |
| F1sf function-built view in a new schema (N1) | 0 | 0 | **2** | 0 | Held: rule 2 `q0api.ideas` + schema probe. |
| F1srv recursive view in a new schema (N1) | 0 | 0 | **2** | 0 | Held: rule 2 + schema probe. |
| R3s client-writable table in a new schema (N1) | 0 | 0 | **2** | 0 | Held: rule 3 `q0x.notes` + schema probe `unlisted: authenticated USAGE on schema q0x`. |
| V06b SECURITY DEFINER function hidden in pgcrypto (N2) | 0 | 0 | **2** | 0 | Held: definer rule 3 names `app.…() (extension pgcrypto)`. |
| LU1 `set U&"client\005fencoding"` (N7) | **1** | 0 | **2** | 2 | Held statically and at mc (escape-spelling rule, line 1019/1020). |
| LU2 `set U&"standard\005fconforming\005fstrings"` (N7) | **1** | 0 | **2** | 2 | Held statically and at mc. |
| E2 `execute E'set…names…'` in a DO body (N7) | **1** | 0 | **2** | 2 | Held statically and at mc. |
| DP5 `notifications_update_own_read_state` widened in the policy (N3) | 0 | 0 | **2** | **2** | Held by mc (permissive probe) and the new rls case. |
| NW `research_evidence_scope_narrows_member` both halves `OR true` (N4) | 0 | 0 | **2** | 0 | Held by mc (pinned policy probe). |

Every 127 exploit that previously passed every layer is now refused by at least one layer, and the
refusal names the object. The six MEDIUM/LOW findings Q0 raised on 127 (N1–N4, N6, plus N7) are closed in
the sense that a drift reproducing each is now caught.

## 3. New rule weakened in code (digests refreshed) + a later-file drift — two fresh mutations each

Mutations are mine, distinct from the Author's set; after each I recomputed the probe digests exactly as
`foundation-contract.test.mjs` does and wrote them back, then paired the mutation with the matching
reviewer drift in `140_audit.sql`. Every file and 140 restored byte for byte after each round.

| Mutation | New rule | static | mc | rs | Caught by |
|---|---|---|---|---|---|
| QMEM1 read only `anon` | client membership | **1** | 2 | 0 | static structural pin + self-test |
| QMEM2 recursive arm `… and false` | client membership | **1** | 2 | 0 | static pin; self-test misses the two-deep member |
| QSCH1 drop `WITH GRANT OPTION` variant | client schema | **1** | 2 | 0 | static pin (the grant-option clause is pinned by regex) |
| QSCH2 schema probe reads `app, public` by name | client schema | **1** | 2 | 0 | static pin (`NON_SYSTEM_SCHEMA` asserted literally) |
| QEXT1 `deptype 'e' -> 'x'` | extension-member definer | **1** | 2 | 0 | static pin; self-test ("a rule that cannot fail asserts nothing") |
| QEXT2 definer rule schema `= 'no_such_schema'` | extension-member definer | **1** | 2 | 0 | static pin + self-test |
| QR3a rule 3 excludes `public` too | client privilege rule 3 | **1** | 2 | 0 | static pin + self-test |
| QR1a MAINTAIN gate `>= 180000` | client privilege rule 1 | **1** | 2 | 0 | static pin; self-test now carries a MAINTAIN drift (closes N6) |
| QESC1 drop the `E''` arm | escape-spelling lexer | **1** | 0 | 0 | **static only** (see §5 limit L1) |
| QESC2 drop the `U&` arm | escape-spelling lexer | **1** | 0 | 0 | **static only** |
| QNW2 remove the else-branch assertion | narrowing no-OR rule | 0 | 0 | 0 | **nothing** — the else-branch is the sole guard (see §5 L2) |

Finding: every new **catalog** rule has two independent signals — an explicit structural pin in
`foundation-contract.test.mjs` (so a refreshed digest does not hide a weakening) **and** a migrate-clean
self-test. The migrate-clean guard verifies its own self-tests ("its self-test after drift N passed … a
rule that cannot fail asserts nothing"), so a probe mutated to never fire is caught at mc even with
digests refreshed. This is the strength of the design and it holds for the membership, schema, extension,
rule-1 and rule-3 changes.

## 4. The new rls-smoke case fails for the right reason

- With the notifications policy widened in `140` **only** (DP5), mc already refuses (permissive probe), and
  the new case fails with `the write must affect no row: 1 row(s) were visible`.
- The true N3 scenario — pin **and** policy widened together, digests refreshed (MP5) — gives
  static 0, **mc 0**, **rs 2**: the only failure is
  `owner-a-cannot-mark-a-teammates-notification-read-by-a-bare-update`, on the right half
  (`the write must affect no row`). So the new case is the sole backstop when the pin is widened with the
  policy, and it catches.
- Loosening the case threshold to `having count(*) > 100` (against DP5) still fails — on the **witness**
  half (`the write was NOT stopped. still_unread is "f"`). The case has two independent assertions; the
  witness half alone catches the cross-user write.

## 5. Graded findings

### Q0-128-F1 — `information_schema` is a blind spot for every new client-exposure probe (MEDIUM, latent)

`scripts/db/run.mjs:451` `NON_SYSTEM_SCHEMA` excludes **both** `pg_catalog` **and** `information_schema`
from the relation rules (client privilege rules 1/2/3), and the extension/SECURITY-DEFINER rule excludes
the same two (`scripts/db/run.mjs:715`, `:734`), as does the policy-helper called-function rule (`:782`).
Batch 128's whole premise is "every schema but the system ones, not three by name" (A1 N1/C0 N1/Q0 N1).
But `information_schema` is **not** inert like `pg_catalog`:

- `pg_catalog` is write-protected — I confirmed `create view pg_catalog.…` fails with
  "System catalog modifications are currently disallowed".
- `information_schema` is **writable by the migration superuser** and **client-usable by default**
  (`has_schema_privilege('authenticated','information_schema','USAGE')` = `t`, granted to PUBLIC by initdb).

**Measured (failure scenario).** On a fresh clean cluster I appended three drifts to `140` placing
client-granted objects in `information_schema`: a definer-rights view built by a function then dropped
(ISV), a no-RLS table (IST), and a SECURITY DEFINER function (ISF). All three passed **every** layer
(static 0, sl 0, mc 0, rs 0). As a stranger (`authenticated`, sub in no workspace) I then read every
workspace's ideas across both tenants through each: `information_schema.q0_ideas` returned 2 rows / 2
workspaces, `information_schema.q0_all_ideas()` returned 2, and I inserted into
`information_schema.q0_notes` (direct `app.content_ideas` read was 0 — RLS held on the base table). A
migration — malicious or mistaken — that places a client-granted relation or definer function in
`information_schema` evades every probe batch 128 added.

This is the same finding-class the batch set out to close (A1 V11 / Q0 F1-sf), relocated to the one
excluded-but-writable schema. It is **latent**: nothing lives in `information_schema` on the integrated
set (the probes measure empty today), so it is not a live leak and not stop-the-line. But the batch's
stated limits (§5 of the plan) name only the platform's managed schemas (`auth`, `storage`,
`graphql_public`, `extensions`); `information_schema` is **not** listed, so this gap is currently
undocumented.

**Remedy.** Do not simply drop `information_schema` from `NON_SYSTEM_SCHEMA` — I measured that the naive
change floods rule 2 with `information_schema`'s own built-in views and flags the default PUBLIC USAGE.
Instead scan `information_schema` for **user-created** objects only, using the OID/initdb-ceiling filter
the `pg_catalog` guard already uses (`run.mjs:1085` et seq., `oid >= 16384`): include it in rules 1/2/3
and the definer rule restricted to `oid >= 16384` (or to objects not owned by `postgres`/not
initdb-created), while leaving the client-schema USAGE probe tolerant of the default `information_schema`
USAGE. One drift (an object placed in `information_schema`) should then be named.

### Q0-128-F2 — the escape-spelling defence is a static-only guard, undocumented as such (LOW / INFO)

`scripts/db/psql-driver.mjs:360` `escapeSpellings` is exercised only by `psqlLex`, which the **static**
lexer test drives. I measured (QESC1, QESC2) that with the `E''` or `U&` arm removed and a reviewer drift
(E2, LU1) in `140`, static fails but **mc passes (0)** and rs passes: migrate-clean has no independent
backstop for an escape spelling once the lexer rule is gone (LU1's identifier is `client\005fencoding`,
which contains no literal `client_encoding` substring, so the text matcher does not fire). This matches
the plan's own MESC2/MESC3 verdicts ("held statically alone") and is the shape of the remedy Q0 asked for
in N7, so it is **not a defect** — but the single-layer nature is worth recording beside the rule. I
verified the fail-closed depth behaviour: a nested `E''` at depth 1, 7, 8, 9, 10 all yield ≥1 finding, and
**all 87** integrated `.sql` files under `db/` and `tests/` carry zero escape spellings, so nothing
integrated is refused.

### Q0-128-F3 — narrowing no-OR rule is static-only, as designed (INFO)

`test-kits/db/foundation-contract.test.mjs` else-branch (`no OR, TRUE or NOT in a narrowing`) is the sole
guard against a narrowing pin widened with `OR true`: QNW2 (remove it, refresh digests, widen the
`research_evidence` pin) passes static, mc and rs. The pinned-policy probe compares the widened text to
the widened pin (both move together) and rls-smoke has no row outside a narrowed member's scope on those
four tables, so neither catches it. This is exactly Q0 N4's remedy as implemented and the plan states the
`1 = 1` residual; recorded for completeness.

## 6. Stop-the-line verdict, and what blocks the merge

- **No stop-the-line.** I found no live tenant leak, no secret, no duplicated side effect, no migration
  divergence, no irreversible deletion, and no contract mismatch on the integrated schema. Every 127
  exploit is now caught; the 677-test suite and 1079-case rls-smoke are green; 140 restored byte for byte.
- **Does not block the merge on test grounds.** Q0-128-F1 is a latent later-edit hazard in a
  defence-in-depth probe (nothing in `information_schema` today), of the same class the batch treats as a
  stated limit elsewhere. My recommendation is that it be **recorded as an open limit** (it is currently
  unstated) and carried forward as the next hardening item, not that it hold this batch.
- **What I did not measure (read only).** The handoff ratchet (`check:handoff`) is judged against the
  Author's branch name; from `review/q0-batch-128` it exits 75 ("no work package declares ownership.branch
  review/q0-batch-128"), which is the guard working as designed on a review branch, not a finding against
  128 (cf. the standing "measure on the branch name" note). `verify-branch-scope` and the full suite,
  which do not depend on the branch name, I ran and they are green. The disposition's account of the #166
  merge and the standing delegation I read; they are A0's record, not the Owner's own text, and I take no
  position on the merge authority — that is the Owner's and Integration Owner's.
- **Independent roles still owed.** C0, A1 and the Integration Owner (R0) have not run on 128; the PR is a
  Draft. RFC-2026-002 requires linked Author, Reviewer, Tester, Security and Integration-Owner evidence and
  a green required CI run before the Owner merges. This review supplies the Tester evidence only.

## 7. Limits of this review

- One engine (PostgreSQL 17.11, Homebrew) on the CI shim; the platform's managed schemas and
  `authenticator` membership are not modelled here (stated by the batch), and my `information_schema`
  finding is likewise measured on the shim, where clients already hold the default USAGE.
- Live layers ran on a clone of the head at `b8435fa`; identical in every file they read to the worktree
  head. Mutations and drifts were applied to saved copies and reverted; `140_audit.sql` sha1
  `2ac2fc2c592b…` before and after.
- I am the Author's subagent (RFC-2026-024); treat §5 as findings for an independent reader to weigh, not
  as a cleared bill.
