# C0 contract review re-check: batch 170-assert's review round

| Field | Value |
|---|---|
| Run | `/claude/c0_contract_reviewer` |
| Role | Independent Reviewer (contract), work package `WP-0A-DB-00`, narrow re-check |
| Subject branch | `agent/claude/WP-0A-DB-00-batch-170-assert` (PR #171, Draft, open) |
| Subject head | `77b6249` (handoff refresh), over code and records `8f5424c` |
| Previous reviewed head | `db995b6` (my review: `c0-batch-170-assert-contract-review-2026-10-03.md`) |
| Base | `2f6ab9e` (`main`) |
| Author | `/claude/a0_atlas` |
| Date | 2026-10-04 (file named for the batch date, 2026-10-03) |
| Reviewed in | my own local branch `recheck/c0-batch-170-assert`, checked out at `77b6249` in a worktree. I ran the guards that read the branch name with the subject branch name checked out (§2) |

This document records findings. It advances no status, approves nothing, and signs nothing on anyone's
behalf.

## §0 What I am

- I am a subagent **spawned by the Author run `/claude/a0_atlas`**, in a worktree that A0's workflow
  created, under a brief that A0's workflow wrote. A0 chose the questions. I went beyond them where I judged
  it necessary, but the framing is A0's.
- I am the **same vendor and model family** as the Author (Claude). RFC-2026-024 withdrew the cross-vendor
  condition, so that alone is not a bar. It still limits independence.
- Whether this file counts as the Reviewer signature that RFC-2026-002 requires is for the **Integration
  Owner and the Product Owner** to decide. I do not decide it.

## §1 Verdict in one paragraph

The review round does what it says it does. My seven findings (F1 to F7) and INFO-1 are each fixed, or
recorded where the round says they are, and I re-measured the ones that can be measured. The three new
pinned grant probe rules (1: no view, matview or foreign table; 3: no superuser except the migration owner;
4: no membership among non-superuser roles) each name my own new drifts by name. The two gaps the round
records as owed, a grant TO a `pg_*` role and a sequence, still pass every layer, exactly as recorded. The
data files did not change. An independent ACL reading still equals `pinned-grants.json`: 1371 = 1371, 0
differences. The guards pass: `verify-branch-scope` exit 0 (22 paths), `check:handoff` exit 0 and
`npm run verify` exit 0 (684/684) on the branch name. CI `bootstrap` is green on `77b6249`. I found
**nothing stop-the-line and nothing that blocks the merge**. I graded one new finding LOW: the probe's
claim text and the handoff say "no other relation" is in `app`/`private`, but five sequences are there and
rule 1 does not read them. There is also one INFO.

## §2 Measured vs read

### Measured (Node `v24.20.0`, checked with `node -v` before each measured run; PostgreSQL 17 from `/opt/homebrew/bin`)

Cluster: `initdb --locale=C -A trust -U postgres`, fresh every round, on 127.0.0.1:**5505** only, TCP only
(`-c unix_socket_directories=''`), with `LC_ALL=C`. The shim `db/foundation/ci/supabase-shim.sql` ran
first, then `DB_TEST_URL=postgresql://postgres@127.0.0.1:5505/postgres make db-migrate-clean`, then
`make db-rls-smoke` twice, then `node scripts/db/generate-pinned-grants.mjs --check`. Some drift rounds
skipped smoke (`nosmoke`). Private directory: `.../scratchpad/c0-170-assertr2/` (`drive.mjs`,
`drifts/*.sql`). Every drift was APPENDED to `db/foundation/migrations/140_audit.sql` from a saved copy.
The file was restored byte for byte before smoke ran, and its sha256 was
`2ac596bb950e8dfb11d9e45172f24305698ecddb4d3e8380114e2bfc1ad37149` after every round and at the end.

| # | Command / round | Tree | Exit | Output |
|---|---|---|---|---|
| 1 | `node scripts/verify-branch-scope.mjs 2f6ab9e WP-0A-DB-00` | `77b6249` | **0** | "all 22 changed path(s) are declared, and every amendment explains one" |
| 2 | `npm run check:handoff`, on the branch NAME (`git switch --ignore-other-worktrees agent/claude/WP-0A-DB-00-batch-170-assert`; `git branch --show-current` confirmed it; HEAD `77b6249`; not detached) | `77b6249` | **0** | "describes the branch: nothing substantive after its cited head" |
| 3 | `npm run verify`, on the branch name | `77b6249` | **0** | "clean: exit 0 — tests 684, pass 684, fail 0, skipped 0, todo 0" |
| 4 | r1 clean: shim / migrate-clean / rls-smoke ×2 / generator `--check` | head | 0 / **0** / **0**, **0** / **0** | pinned grant: "66 tables … no other relation is there … no superuser but the migration owner exists … member of exactly the 0 pinned role(s) … 43 table-level and 1328 column-level … (self-test: refused each of its 6 drifts)". Read allowlist 0 + 41, 2 drifts. Classification 66 / 8 / 0. Post-migrate 49 / 37 / 12. 1079 isolation cases each smoke run, 6 authz claims. Generator: both files "matches the catalog" |
| 5 | r1: my independent ACL reading (`aclexplode` over `relacl`/`attacl`, closed over membership and PUBLIC), compared with both files | head | 0 | 7 roles. Table list identical (66). **1371 = 1371, 0 only in the file, 0 only in the catalog.** app_worker 43 T + 649 C, authenticated 675 C, app_authz 4 C. 0 grantable items. No non-superuser owner. 41 client SELECT relations = the 41 exceptions. No view in `app`/`private`. `anon` has no USAGE on `app` |
| 6 | r1: `pg_auth_members`, `pg_roles`, relkinds in `app`/`private` | head | 0 | Memberships: `pg_monitor` → three `pg_*` roles, and `postgres` → each `app_*` (inherit f, set t). Superusers: `postgres` = `session_user`. Relkinds: app r 62, i 253, **S 4**; private r 4, i 16, **S 1** (`app.outbox_events_id_seq`, `consumer_ledger_id_seq`, `usage_events_id_seq`, `performance_snapshots_id_seq`, `private.meta_webhook_inbox_id_seq`, all with a null ACL). Plan §9's "the only memberships are the migration owner's in each app_* role, and pg_monitor's own" holds |
| 7 | dR4 `grant app_worker to app_command; grant pg_read_all_data to service_role;` | head | mc **2** | rule 4: "role membership(s) of a non-superuser role not pinned …: app_command -> app_worker, service_role -> pg_read_all_data" |
| 8 | dR3 `create role probe_su superuser nologin;` | head | mc **2** | rule 3: "superuser role(s) other than the migration owner …: probe_su" |
| 9 | dR1 `create view app.probe_v with (security_invoker = true) as select id from app.jobs;` (an invoker view with no grant) | head | mc **2** | rule 1: "not a table: app.probe_v (relkind v)" |
| 10 | dOwed `grant usage, select, update on sequence app.outbox_events_id_seq to app_command; grant usage on sequence private.meta_webhook_inbox_id_seq to app_worker; grant select on app.jobs to pg_read_all_stats;` | head | mc **0**, rs **0** / **0**, gen **0** | **passes every layer**, as recorded owed on `[185]` and in README rule 7 (sequences; a grant TO a `pg_*` role) |
| 11 | dRev `revoke select on app.notifications from authenticated;` (C0 F7(b)) | head | mc **2**, rs 2 / 2, gen **1** | pinned grant "missing: authenticated SELECT (channel) on app.notifications; …"; read allowlist "row(s) matching no client grant: authenticated SELECT (columns) on app.notifications". Generator: both files "DIFFERS", stderr "a migration grants SELECT on app.notifications to authenticated and the catalog holds none (a later revoke?); not written". Reported, not refused: **F7(b) fixed** |
| 12 | dG1 dRev + `grant select (id) on app.workspaces to anon;` (C0 F7(a)) | head | mc **2**, gen **3** | read allowlist names "anon SELECT (columns) on app.workspaces". Generator: "REFUSED, nothing written: anon SELECTs app.workspaces and no migration grants it". `anon` is now read and is no longer silently left out: **F7(a) fixed**. The exit is 3, not A0's 1 for G13, because my driver restores the migration text before the generator runs, so no `granted_by` exists |
| 13 | dG2 `grant select on app.user_profiles to authenticated;` | head | mc **2**, gen **3** | "REFUSED, nothing written: a table-wide client SELECT for authenticated on app.user_profiles"; no stack trace |
| 14 | Assertion counts by the guard's own `stripNonCode` and `/\bassert\.\w+\(/g` | `db995b6`, `77b6249` | 0 | foundation-contract 788 → **793** (tests 80), identity-isolation 2167 → 2167 (tests 305). The floors in `scripts/test-suite-contract.mjs:206`, `:213` are exact. The integrity manifest holds 88 digests |
| 15 | `read-allowlist-known-exceptions.json` rows by `granted_by` | head | 0 | 010 ×5, 020 ×4, 021 ×1 = **10**. The other **31** come from 13 migrations (030, 040, 051, 061, 070, 080, 081, 090, 091, 100, 120, 121, 130). The `[18]` text says "28 of them first committed after RFC-021's approval on 2026-09-06". By `git log --diff-filter=A`, 030 (1 row) and 040 (2 rows) were first committed on 2026-09-06 itself and the rest later, so it holds if "after" means "on a later day" |
| 16 | The cherry-picked review files compared with their sources (`git rev-parse <src>:<path>` vs `HEAD:<path>`) | — | 0 | C0, A1 and Q0 blobs are identical (`3ec2ac7`, `88a71f3`, `565404d`) |
| 17 | `work-packages/WP-0A-DB-00.json` line count, `db995b6` vs head | — | 0 | 455 = 455. Five one-line hunks (`:268`, `:343`, `:365`, `:435`, `:443`), so the line citations survive |
| 18 | Line citations in the handoff's reviewer instruction | head | 0 | `scripts/db/run.mjs:1221` opens section 6 ("THE GRANT SET ON EVERY TABLE …"), and `:1287` is `export const PINNED_GRANT_PROBE_SQL`. Both are exact |
| 19 | `gh pr view 171` / `gh pr checks 171` | — | 0 | OPEN, Draft, head `77b62499…`, `bootstrap` **pass** (run 37153858421) |

At the end the cluster was stopped and its data directory removed after every round. Port 5505 is free
(`lsof` exit 1). No other port was touched. `140_audit.sql` is byte-identical to the saved copy. The
worktree is clean apart from this file.

### Read, not measured

- `git diff db995b6..77b6249`, with the code hunks (`scripts/db/run.mjs`, the generator, the two test
  files) in full. The cherry-picked A1 and Q0 reviews only as far as the plan cites them.
- Plan §7 (Q170-b and Q170-d rows) and §9, the disposition's §5 rows, README rules 7, 16 and 17, the
  word-level diff of `open_blockers` `[18]`, `[93]`, `[115]`, `[185]` and `[193]`, the handoff's diff, and
  both commit messages.
- RFC-2026-021 status line (`:3`, approved 2026-09-06) and §8.5, `121_publisher_metrics.sql:161` and
  `:297-298`.
- The in-memory weakenings W1b and W2b (plan §9.2, Q0 Q-5) I read, not re-ran. The anchored count `2` and
  the `REFUSED_CLASS_TABLES` array check are visible in `test-kits/db/foundation-contract.test.mjs`
  `:2982-2983` and `:3108-3109`, and `npm run verify` passes with them.

## §3 My earlier findings, one by one

| Finding | Status at `77b6249` | How I know |
|---|---|---|
| F1 (LOW) the 10/31 "inherited" split | **Fixed.** It is stated in the exceptions `_what` (and in the generator's copy, so `--check` still matches), in plan Q170-b, the disposition row, `[18]`, `[93]` and README rule 16. Each says that closing at 41 accepts the 31, and puts that to A1 and the Owner | measured: rows 4, 15 |
| F2 (LOW) Q170-d's alternatives | **Fixed.** Plan §7 and the disposition add column classification as the vehicle, separate answers for INTERNAL-3 and PROVIDER-3, the coupling with Q170-b and RFC-021 §3, and the fact that `pinned-grants.json` already pins client columns. The recommendation stands, which I accept | read |
| F3 (LOW) the entry side of rule 2 | **Recorded**, as asked, on `[115]` and in README rule 16, owed before the first entry. Inert at `[]` | read |
| F4 (INFO) | No remedy was asked for and none was made | — |
| F5 (LOW) `payload`/`metrics`; `_rule` | **Fixed.** `_columns` names `metrics` (`121_publisher_metrics.sql:161`), and `_rule` now covers a `named_in_family: false` table resolved INTO a refused class by §9.1's own example (`billing_webhook_receipts`, `data-classification.json:150-158`). No class changed: classification 66 / 8 / 0 | measured: row 4 |
| F6 (LOW) commit `4d9c9ac`'s floors | **Recorded, not rewritten.** Correct: pushed history stays | — |
| F7 (LOW) the generator | **(a)–(c) fixed, (d) recorded.** (a) `anon` is read: row 12. (b) a later REVOKE is reported and exits 1, not refused: row 11. (c) MAINTAIN only on 17+ (`generate-pinned-grants.mjs:39-40`). (d) The header and README rule 7 call it "a reviewer's tool, not a gate", and `[193]` (11) records the `--check` contract test as owed if the Integration Owner wants one | measured: rows 11–13 |
| INFO-1 | Recorded, not rewritten. README rule 17's heading is now narrower still (A1 R5) | read |
| Small items (the `:1232` citation; "ten drifts") | Citation fixed (row 18). "Ten drifts" recorded in plan §9.2 | measured / read |

## §4 Answers to the brief's questions

1. **Is `pinned-grants.json` exactly today's effective privileges?** Yes. The file is unchanged in this
   round, and my independent ACL reading again equals it, 1371 = 1371 with 0 differences (row 5). The
   generator's `--check` agrees (row 4). The new rule 4 makes the premise behind the ACL and `has_*`
   readings agreeing (no membership among non-superuser roles) a rule, where before it was only an
   observation. It is measured empty (row 6).
2. **Is the allowlist plus the exceptions block faithful to RFC-021 §8.1/§8.2/§8.5?** It is as faithful
   as at `db995b6`, and now honest about the one reading it makes. §8.5's "inherited" is 10 rows, and the
   31 others are named as accepted by closing at 41, put to A1 and the Owner (F1). §8.1 is unchanged
   (`[]`). §8.2's entry side is recorded as owed (F3).
3. **Is `data-classification.json` faithful to ERD §5/§9.1, with ambiguous tables left as findings?** Yes.
   Only text changed (F5), and the probe output is unchanged: 66 tables, 8 refused, 0 columns, and the
   twelve mixed rows are still `class: null` with a `finding`. **Is Q170-d framed honestly with real
   alternatives?** Yes, now. The widened text is fair, and it does not bias the question toward A0's
   recommendation.
4. **Ownership amendments.** `verify-branch-scope` exits 0 over 22 paths (row 1). This round touches no
   new protected file. It changes the two already-amended files again (`scripts/test-suite-contract.mjs`:
   the floor 788 → 793, exact by row 14; `test-kits/integrity-manifest.json`: three digests). The
   identity-isolation edit is inside `writable_paths` (`tests/db/identity/**`). It widens batch 132's
   delegated "no migration creates a view" regex to `(?:materialized\s+)?view`, which is stricter, adds no
   assertion and leaves the count at 2167.
5. **Are the claims true?** Yes, with the two exceptions below: R-1 (the "no other relation" wording) and
   a small item (one handoff test entry gives exit 3 to two commands, one of which exits 1, which its
   result text states). The commit messages for `8f5424c` and `77b6249` match their diffs. Plan §9.2 and
   §9.3 match what I re-measured. The cherry-pick claim holds byte for byte (row 16). "No migration,
   policy, grant or role is added" holds: the diff touches no file under `db/foundation/migrations/`.

## §5 Findings

Severity scale: HIGH (blocks merge), MEDIUM (fix before merge or record a decision), LOW (fix or record
in a later batch), INFO.

**R-1 (LOW). The pinned grant probe's claim says "no other relation is there", but rule 1 reads only
relkinds v, m and f, and five sequences are there.** The claim at `scripts/db/run.mjs:1806` (printed in
every `migrate-clean`) reads "… exactly the pinned list and no other relation is there". The handoff's
acceptance evidence (`handoffs/WP-0A-DB-00-author-handoff.json:54`) says "the table list closed both ways
with no other relation in app or private". Rule 1's SQL (`run.mjs:1300-1303`) names relkind `v`, `m` and
`f` only. Row 6 measured four sequences in `app` and one in `private`. Row 10 measured that USAGE, SELECT
and UPDATE on `app.outbox_events_id_seq`, granted to `app_command`, pass every layer, and UPDATE lets a
role `setval` the outbox's id sequence. README rule 7 is exact about this ("sequences and functions (owed
on blocker 185)"), and so is `[185]`, so the gap is recorded. Only the claim and the handoff overstate it.
*Remedy:* in the next touch of either, write "no view, materialized view or foreign table" in place of "no
other relation". The probe digest hashes the SQL and the self-tests, not the claim
(`test-kits/db/foundation-contract.test.mjs:2595-2596`), so the digest does not move. Nothing else is
needed until `[185]`'s sequence item is paid.

**INFO-2. Rules 2 and 3 hold only where the migration owner is a superuser.** Rule 3 refuses any
superuser other than `session_user`. On a provisioned Supabase instance the migration role is
customarily not a superuser and a platform superuser exists, so rule 3 (like rule 2 before it) would fail
there by construction. The probe runs only in `migrate-clean` on the CI shim, so this is not a defect
today. It belongs with F13 and Q170-c, the provisioned-instance measurement, and should be read there
before the probe is ever pointed at such an instance. No remedy now.

Not graded: the handoff test entry "review round drifts G11 and G13" records `exit_code: 3` for two
commands, one of which (G13) exits 1. Its result text says so.

## §6 Stop-the-line

**None.** There is no secret, no tenant leak, no side effect, no lost job, no migration divergence, no
irreversible deletion and no contract mismatch. No migration, policy, grant or role changed. Every new
rule I drifted made the head stricter, and none made it looser. The two gaps that still pass every layer
(row 10) existed before this batch and are recorded as owed.

## §7 Does anything block the merge?

Nothing I found blocks it. R-1 is wording. The merge still needs what this file cannot give: A1's and
Q0's re-checks of this round, Integration Owner evidence (RFC-2026-025 §5, still open by the handoff's own
account), and the Product Owner's act. Q170-a..d stay UNANSWERED, and the batch is written so that it does
not depend on their answers.

## §8 Limits

- Same vendor and model family as the Author, and spawned by the Author's workflow (§0).
- One clean round and eight drift rounds on one machine. I re-ran the round's rules with my own drifts,
  not A0's d01–d06/G17/G18/T02/T07 one by one. I did not re-run W1b/W2b. I did not run `make
  db-schema-lint`.
- CI shim roles only. A provisioned instance (F13, Q170-c) was not read (INFO-2).
- To run the branch-name guards I switched to the subject branch name with `--ignore-other-worktrees`
  without moving the ref, committed nothing on it, and switched back to `recheck/c0-batch-170-assert`.
  `npm run verify`'s log was first written to the scratchpad root and then moved into my private
  directory.
