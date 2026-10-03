# C0 contract review: batch 170's assertion-only part

| Field | Value |
|---|---|
| Run | `/claude/c0_contract_reviewer` |
| Role | Independent Reviewer (contract), work package `WP-0A-DB-00` |
| Subject branch | `agent/claude/WP-0A-DB-00-batch-170-assert` (PR #171, Draft) |
| Subject head | `db995b6` (handoff refresh), over code `dee6561` and records `13cc635` |
| Base | `2f6ab9e` (`main`) |
| Author | `/claude/a0_atlas` |
| Date | 2026-10-04 (file named for the batch date, 2026-10-03) |
| Reviewed in | local branch `review/c0-batch-170-assert` at `db995b6`, in a worktree; the guards that read the branch name were run with the subject branch name checked out (§2) |

This document records review findings. It advances no status, approves nothing, and signs nothing on
anyone's behalf.

## §0 What I am, before anything else

- I am a subagent **spawned by the Author run `/claude/a0_atlas`**. I run in a git worktree that A0's
  workflow created, under a brief that A0's workflow wrote. A0 chose the questions I was asked. I went
  beyond them where I judged it necessary, but the framing is A0's.
- I am the **same vendor and model family** as the Author (Claude). RFC-2026-024 withdrew the
  cross-vendor condition, so that is not by itself a bar. It is still a real limit on independence, and a
  reader should weigh it.
- Whether this file counts as the Reviewer signature that RFC-2026-002 requires is for the **Integration
  Owner and the Product Owner** to decide. I do not decide it.

## §1 Verdict in one paragraph

The batch does what the phase plan's "Batch 170 -- Can do now" items (a), (b) and (c) ask, and adds no
migration, policy or grant. I measured `pinned-grants.json` independently, from `relacl`/`attacl` through
`aclexplode`, closed over role membership and PUBLIC. That is a different method from the Author's
`has_*_privilege`. It equals the file exactly: 66 tables, 43 table-level and 1328 column-level privileges,
no grant option, and no non-superuser owner. The known-exceptions block equals the measured client SELECT
set (41 relations, `authenticated` only, by column). `data-classification.json` cites every ERD §5 row
correctly, with 0 mismatches over 66 tables, and leaves the twelve ambiguous tables as findings. The plan's
two "passed every layer before" drifts pass `migrate-clean` and `rls-smoke` on main and fail `migrate-clean`
on this head, as claimed. The guards pass: `verify-branch-scope` 0, `npm run verify` 0 (684/684) and
`check:handoff` 0 on the branch name. I found **nothing stop-the-line and nothing that blocks the merge**.
I graded seven findings, all LOW or INFO. Most are about how the records frame two questions, Q170-b and
Q170-d, rather than about the code.

## §2 Measured vs read

### Measured (Node `v24.20.0`, checked with `node -v` before each measured run; PostgreSQL 17.11 from `/opt/homebrew/bin`)

Cluster: `initdb --locale=C -A trust -U postgres` afresh every round, 127.0.0.1:**5505** only, TCP only
(`-c unix_socket_directories=''`), `LC_ALL=C`, the shim `db/foundation/ci/supabase-shim.sql` first, then
`DB_TEST_URL=postgresql://postgres@127.0.0.1:5505/postgres make db-migrate-clean` and `make db-rls-smoke`
twice on the same database. Private directory `.../scratchpad/c0-170-assert/`. Every drift was APPENDED to
`db/foundation/migrations/140_audit.sql` from a saved copy and restored byte for byte. The sha256 was
`2ac596bb950e8dfb11d9e45172f24305698ecddb4d3e8380114e2bfc1ad37149` after every round, and is the same at
the end.

| # | Command / round | Tree | Exit | Output |
|---|---|---|---|---|
| 1 | `node scripts/verify-branch-scope.mjs 2f6ab9e WP-0A-DB-00` | `db995b6` | **0** | "all 19 changed path(s) are declared, and every amendment explains one" |
| 2 | `npm run check:handoff`, on the branch NAME `agent/claude/WP-0A-DB-00-batch-170-assert` (`git switch --ignore-other-worktrees`; not detached) | `db995b6` | **0** | "describes the branch: nothing substantive after its cited head" |
| 3 | `npm run verify`, on the branch name | `db995b6` | **0** | "clean: exit 0 — tests 684, pass 684, fail 0, skipped 0, todo 0" |
| 4 | r1 clean: shim / migrate-clean / rls-smoke ×2 | head | 0 / **0** / **0**, **0** | pinned grant 66 tables, 43 / 1328, 4 drifts refused; read allowlist 0 entries, 41 exceptions, 2 drifts; data classification 66 tables, 8 refused, 0 columns, 2 drifts; post-migrate pass 49 / 37 / 12; 1079 cases each smoke run, 6 authz claims |
| 5 | r1: independent ACL reading (`aclexplode` over `relacl` and `attacl`, membership closure with `inherit_option`, PUBLIC as grantee 0; a column ACL row dropped when the same role holds that privilege at table level), compared with both JSON files | head | 0 | roles: anon, app_authz, app_command, app_maintenance, app_worker, authenticated, service_role. Table list identical (66). Privileges in the file 1371, in the catalog 1371, **0 only in the file and 0 only in the catalog**. By role: app_worker 43 T + 649 C, authenticated 675 C, app_authz 4 C. Grantable ACL items 0. Non-superuser owners: none. Client SELECT relations 41, identical to the exceptions. No view in `app`/`private`; `anon` has no USAGE on `app` |
| 6 | r1: `node scripts/db/generate-pinned-grants.mjs --check`; then without `DB_TEST_URL` | head | **0**; **2** | both files "matches the catalog", 66 tables; "refuses without one" |
| 7 | r1: `pg_auth_members` among non-superusers | — | 0 | none (only `pg_*` into `pg_monitor`, `app_*` into `postgres`) |
| 8 | dC1 `grant select (input_ref) on app.jobs to authenticated;` | head | mc **2**, rs 0 / 0 | named by all three: pinned grant (unlisted column), read allowlist ("authenticated SELECT (columns) on app.jobs"), data classification ("authenticated SELECT on app.jobs") |
| 9 | bC1, the same drift | main `2f6ab9e` (`git archive`) | mc **0**, rs **0** / **0** | passes every layer on main: plan §4's "C1 passed every layer before" holds on this base |
| 10 | hB2 `grant select on app.workspaces to authenticated;` | head | mc **2**, rs 0 / 0 | pinned grant ("unlisted: authenticated SELECT on app.workspaces"); read allowlist ("(table) on app.workspaces") |
| 11 | bB2, the same drift | main | mc **0**, rs **0** / **0** | passes every layer on main: plan §4's B2 claim holds |
| 12 | dA `grant select (token_hash) on app.workspace_invitations to authenticated;` (a new column on an EXCEPTED relation) | head | mc **2**, rs **2** / **2** | pinned grant names it; **read allowlist and data classification silent** (by design, F4); rls-smoke `owner-a-cannot-read-a-token-digest` |
| 13 | dB `create view public.probe_jobs_v as select id, input_ref from app.jobs; grant select on ... to authenticated;` (definer view outside `app` over an INTERNAL-3 table) | head | mc **2**, rs 0 / 0 | client privilege probe ("not pinned or not security_invoker") and read allowlist ("(view) on public.probe_jobs_v"); data classification silent (INFO-1) |
| 14 | dF a `security definer` function in `public` returning `app.jobs.input_ref`, EXECUTE to authenticated | head | mc **2**, rs 0 / 0 | security definer probe ("not a pinned SECURITY DEFINER function"); data classification silent (INFO-1) |
| 15 | Assertion counts via the guard's own `stripNonCode` and `/\bassert\.\w+\(/g` | `2f6ab9e`, `db995b6` | 0 | foundation-contract 747 → **788**, identity-isolation 2166 → **2167**; tests 80 and 305 on both: the floors are exact |
| 16 | WP line citations: every number on every changed line of `retention-map.json`, `audit-coverage-map.json` and the CTR-AUD-001 fixture, base against head | — | 0 | **55** changed (19 + 35 + 1), every one exactly -1; the 33 `{ index, line }` pairs each equal the head manifest line of the blocker they name |
| 17 | `open_blockers`, base 193 against head 194 | — | 0 | `[18]`, `[93]`, `[115]`, `[185]` are pure appends, `[193]` is new at the end, no other blocker or top-level field changed; `ownership` changes only `branch` and `amends_without_owning` |
| 18 | `PINNED_GRANT_PROBE_SQL` size | head | 0 | 94 421 bytes (F15's "about 94 KB" holds) |

Migrate-clean wall times on this machine were 5.9–14.0 s on the head and 7.8–9.3 s on main. Other review
clusters were running concurrently, so these numbers are noise. They neither confirm nor refute F15's
4.6–4.7 s.

At the end the cluster was stopped and its data directory removed. Port 5505 is free (`lsof` exit 1). No
other port was touched, and the worktree is clean.

### Read, not measured

- ERD §5 (`docs/sprint-0a/sprint-0a-core-erd-rls-retention-th.md:192-219`) and §9.1/§9.2 (`:436-469`).
  Every registry row's cited line carries the module and exactly its `erd_classes`. I checked that
  mechanically, 0 mismatches.
- RFC-2026-021 §3 and §8.1-§8.5 (`architecture/decisions/RFC-2026-021-client-read-allowlist.md:142-173`,
  `:406-467`).
- The three probes (`scripts/db/run.mjs:1221-1431`, `:1760-1814`), the generator, the batch 170 static
  blocks in `test-kits/db/foundation-contract.test.mjs` (`:2985`, `:3031-3060`), and the
  identity-isolation edit (`tests/db/identity/identity-isolation.test.mjs:8029-8046`).
- The plan, the disposition, the handoff, every commit message, and `git diff 2f6ab9e..db995b6`.
- The 120/121 citations behind F1 (`120_publisher.sql:330`, `:563`; `121_publisher_metrics.sql:261`,
  `:297-298`). Each reads as the plan says.

## §3 Answers to the brief's questions

1. **Is `pinned-grants.json` exactly today's effective privileges?** Yes. An independent ACL-based reading
   matches it privilege for privilege, 1371 = 1371 with 0 differences (§2 row 5), and the generator's
   `--check` agrees (row 6). On this cluster there is no role membership among non-superusers, so the
   ACL and `has_*` readings cannot diverge here. On a provisioned instance they could (F13, Q170-c).
2. **Is the allowlist plus exceptions block faithful to RFC-021 §8.1/§8.2/§8.5?** §8.1: yes. It is `[]`,
   and any future entry is held to exactly §8.1's fields with `caller` required. §8.2: the SELECT half, both
   ways, is a catalog rule, and the migration-text half is honestly recorded as owed (`[115]`). §8.5: the
   list is closed, but at RELATION granularity. Column-level closure comes from rule 7 (F4, measured).
   Rows from 13 migrations that §8.5 does not name were folded into "inherited" (F1). The entry side of
   rule 2 checks two of §3's five objects (F3).
3. **Is `data-classification.json` faithful to ERD §5/§9.1?** Yes. Every class is the cited row's,
   verbatim. The four resolutions only add refusals. The twelve mixed refused/non-refused rows have
   `class: null` and a `finding`. Two text defects are noted in F5.
4. **Is Q170-d framed honestly?** Yes on the facts. It says rule 17 passes only because the tables are
   unclassified. But it offers two alternatives where there are at least four, and it omits its coupling
   with Q170-b (F2).
5. **Ownership amendments.** Three files are amended without ownership, each explained in the rationale:
   `scripts/test-suite-contract.mjs` (the floors, exact), `test-kits/branch-identity.test.mjs` (the slot)
   and `test-kits/integrity-manifest.json`. `verify-branch-scope` exits 0. `evidence/VERIFICATION.md` was
   correctly dropped, because the suite stays 684. The identity-isolation change is inside
   `writable_paths` (`tests/db/identity/**`). It is the edit batch 132's message delegated to "the batch
   that lands it", and it adds presence and emptiness (+1 assertion). The test name is left stale and
   held as F9 in `[193]`.
6. **Are the claims true?** Yes, except the stale floor numbers in one commit message (F6) and one
   nonexistent column named in the registry (F5). The handoff's "head" is `13cc635`, which is the
   designed "last and alone" shape, and `check:handoff` accepts it.

## §4 Findings

Severity scale: HIGH (blocks merge), MEDIUM (fix before merge or record a decision), LOW (fix or record
in a later batch), INFO.

**F1 (LOW). The §8.5 "inherited" list now includes 31 rows from migrations §8.5 does not name, and Q170-b
does not say so.** RFC-021 §8.5 (`RFC-2026-021-client-read-allowlist.md:461-467`, and `:512`) names "the
inherited base-table grants in `010`, `020`, `021`" and says the list "enumerates exactly the grants that
exist today, and any new one fails". `read-allowlist-known-exceptions.json` has 41 rows. Ten come from
010/020/021 (010 ×5, 020 ×4, 021 ×1). Thirty-one come from 030, 040, 051, 061, 070, 080, 081, 090, 091,
100, 120, 121 and 130. Those later batches recorded their growth as debt owed to 170 (`open_blockers[18]`,
`[93]`, the latter asking 170 to "enumerate what exists rather than what a header remembers"), so
enumerating all 41 follows the record. The consequence is that closing at 41 ratifies the 31 as §8.5
exceptions. That decision belongs to the RFC owner (A1) and the Owner, not to the Author's data file.
`_what` (`read-allowlist-known-exceptions.json:2`), Q170-b (plan `:281`, disposition `:94`) and the
`[18]`/`[93]` extensions all say "inherited" without the split.
*Remedy:* state the 10/31 split, and that closing at 41 accepts the 31, in Q170-b's text and in the
exceptions file's `_what`, so that A1 and the Owner accept it knowingly. No data change.

**F2 (LOW). Q170-d presents two alternatives where there are at least four, and omits its coupling with
Q170-b.** Plan `:283` and disposition `:96` offer "no client privilege" against "a pinned safe
projection". They do not mention four things:
- **Column classification as the vehicle.** The ERD owner classes the 120/121 tables CONTENT-2 and their
  provider columns PROVIDER-3 (F3's empty `columns` map). Rule 17's column half then does the work and the
  rule's wording stays as it is.
- **Separate answers for the two classes.** §9.1 gives INTERNAL-3 "redacted status only" and PROVIDER-3
  "safe projection only", so the two classes need not share one answer.
- **The coupling with Q170-b and RFC-021 §3.** In RFC-021's vocabulary a client projection is an
  allowlist ENTRY: a `security_invoker` view, column grants, a policy, and a row carrying `sensitivity`.
  A "pinned safe projection" on the base table may contradict a Q170-b answer of "convert to views".
- **What already exists.** A per-table "allowlist of the exact columns a client may read" already exists
  for every table as `pinned-grants.json`. The recommendation's real delta is a class-aware rule, not a
  new list.

*Remedy:* add these alternatives and the coupling to Q170-d before it is put to A1 and the Owner. The
recommendation may stand.

**F3 (LOW). The entry side of the read allowlist's rule 2 checks two of RFC-021 §3's five objects and
ignores the entry's `columns`.** `readAllowlistRows` (`scripts/db/run.mjs:1346-1349`) turns an entry into
"SELECT (view) on the view" and "SELECT (columns) on each base table". It does not check:
- the SELECT policy on the base table (§3 object 4);
- schema USAGE (object 5);
- whether the granted columns equal the entry's `columns`.

`security_invoker` is held elsewhere: the client privilege probe named it in my dB round. §8.2's third
bullet asks that "every registry entry corresponds to objects that actually exist". This is inert while
the array is `[]`, so it is LOW.
*Remedy:* record it on `open_blockers[115]` beside F8, owed before the first entry lands.

**F4 (INFO). §8.5's closure at column granularity rests on rule 7, not on the allowlist rule.** Measured
in round dA: a new client column on an excepted relation, `token_hash` on `workspace_invitations`, is named
by the pinned grant probe alone, while the read allowlist and data classification probes are silent. This
is by design and stated (`run.mjs:1323-1342`, README rule 16, "Which columns are granted is rule 7's").
I record it so that nobody reads rule 16 alone as the §8.5 closure. No remedy.

**F5 (LOW). Two text defects in `data-classification.json`.** `_columns` (`:5`) names
`performance_snapshots.payload`, a column that does not exist. The table's columns are `id, workspace_id,
business_profile_id, published_post_id, metric_time, metrics, metrics_schema_version, collected_at`, so
the intended column is `metrics`. Separately, `_rule` (`:3`) says a row is resolved "only where §9.1 or
§9.2 names the table's own content" for a **multi-class §5 row**. `app.billing_webhook_receipts` (`:150`)
is instead resolved INTO PROVIDER-3, a class its row (PII-2/FIN-3) does not carry. That case is disclosed
in its own `finding` and in F4 of the plan, but the file's stated rule does not cover it. Neither defect
changes what the probe refuses.
*Remedy:* write `metrics`, and add the single-table §9.1 resolution to `_rule`.

**F6 (LOW). Commit `4d9c9ac`'s message gives floors its content does not set.** The message says
"assertion floors 525 -> 590", but the cherry-picked content sets 747 → 788, from the conflict
resolution. Plan §0 and `dee6561`'s message disclose it. The history is pushed and must not be rewritten.
*Remedy:* none beyond this record.

**F7 (LOW). The generator (F14, "closed here") works but is narrow and unexercised.**
`scripts/db/generate-pinned-grants.mjs` reproduces both files byte for byte (row 6). It has four limits:
- **(a)** `renderExceptions` (`:93`) reads `authenticated` only. A future `anon` or PUBLIC client SELECT
  would be silently left out of the regenerated exceptions file. The probe would then fail loudly, so
  this is not a hole.
- **(b)** `:100` throws when a migration's text grants SELECT to `authenticated` and the catalog has none.
  A legitimate later REVOKE, which a closed list exists to permit, would therefore make the generator
  refuse.
- **(c)** `:31` and `:44` hard-code `MAINTAIN`, so the generator errors before PostgreSQL 17, while the
  probe guards it with `server_version_num`.
- **(d)** No Make target, npm script, test or CI step runs it. The data's agreement with the catalog is
  enforced by the probe in `migrate-clean`, but the generator itself can rot unnoticed.

*Remedy:* a later batch handles (a) to (c), and either a contract test that runs `--check` on the clean
set or a note on `[193]` that it is a manual tool.

**INFO-1. "No client reach into a refused class" (commit titles) is wider than rule 17.** Rule 17 reads
privileges on the refused TABLE. A definer view or a SECURITY DEFINER function over `app.jobs.input_ref`
gives a client the same rows with rule 17 silent. Both are held by existing probes, measured in rounds dB
and dF. README rule 17's wording is exact. Only the commit titles overstate. No remedy.

Small items, not graded: the handoff's reviewer instruction cites "the pinned grant probe from :1232",
but the block starts at `run.mjs:1221` and `PINNED_GRANTS` is at `:1248`. Commit `e3f1db7` counts "ten
drifts" where the table has nine drifts plus the clean row.

## §5 Stop-the-line

**None.** No secret, tenant leak, side effect, lost job, migration divergence, irreversible deletion or
contract mismatch. No grant, policy or migration changes. Every drift I applied made the head stricter
than main, and none made it looser.

## §6 Does anything block the merge?

Nothing I found blocks it. F1 and F2 are framing defects in records that put open questions to their
owners. They should be corrected before or alongside the questions being asked, and they do not gate the
code. The merge still needs what this file cannot give: Q0's and A1's reports, Integration Owner evidence
(RFC-2026-025 §5, still open by the disposition's own account, `:64-66`), and green CI on the head.

## §7 Limits

- Same vendor and model family as the Author, and spawned by the Author's workflow (§0).
- One clean round and six drift rounds on one machine shared with other reviewers' clusters. I did not
  run `make db-schema-lint` and did not re-run the Author's A1-A4, B1, B3 or C2 drifts. I re-ran B2 and C1
  on both base and head.
- I measured on the CI shim's roles only. A provisioned Supabase instance (F13, Q170-c) was not read.
- I checked the ERD classification mechanically for citation fidelity. Whether a §9.1 example "names the
  table's own content" (the four resolutions) is a reading, and I agree with it. It is not a measurement.
- To run the branch-name guards I checked out the subject branch name with `--ignore-other-worktrees`,
  without moving the ref. I committed nothing on it.
