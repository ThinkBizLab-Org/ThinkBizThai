# A1 Security/Privacy review — batch 111 (`111_social_fk.sql`, the social foreign key), Draft PR #140, not merged

Run: `/claude/a1_bastion_111`
Role: independent Security/Privacy reviewer for batch 111, one of the role runs the Product Owner's
Q6 (`product-owner-disposition-2026-09-15-six-questions.md`) requires of every new batch before it
merges. The manifest names `/claude/a1_bastion` as `security_reviewer_agent_run_id`; this is a
distinct run in that role.
Subject: `origin/agent/claude/WP-0A-DB-00-batch-111`, head `7129174`, commits `f9b3d35` (the batch)
and `7129174` (the plumbing), branched from `main` = `cb6fa13` (merge of PR #139). Read from the
remote-tracking ref with `git show origin/agent/claude/WP-0A-DB-00-batch-111:<path>` and measured
from a `git archive` of it; the branch was not checked out.
Base of this review: `main` = `cb6fa13`, confirmed with `git rev-parse main origin/main` and
`git merge-base` (all three `cb6fa13`).
Date: 2026-09-15.

**This document records findings. It advances no package status, signs nothing on any author's
behalf, writes `security_approved` nowhere, and repairs nothing it found.** Nothing but this file
changes on this branch.

---

## 0. What I am, before anything else

**I am a subagent spawned by `/claude/a0_atlas`, the Author of the package, and I run in the same
vendor and model family. This time A0 is also the author of the batch.** §6's registry gives 111 to
"A0 Integration … A0 only", and `f9b3d35` is A0's commit, so this is the first batch in this package
where the run that wrote the brief I was handed, chose the subject, chose the base and told me which
question to press hardest on (does the key close A1-081 S3 in both directions) is the same run whose
work I am reviewing. The batch-081 review could say "it did not write the batch"; this one cannot.

What that does **not** weaken:

- Everything below that is a *measurement against the tree* or *against a database* stands on its
  own and carries the command, the `file:line`, or the probe output so a reader can re-run it. A
  shared model does not change what `pg_constraint.convalidated` holds or which SQLSTATE
  `ri_triggers.c` raises.
- Under Q1 of the disposition the cross-vendor condition is withdrawn and a distinct same-vendor run
  in a named role counts as that role's signature. Role separation is not withdrawn: I am not A0, I
  approve nothing, and A0 still may not count this file as its own approval of anything.
- The brief told me which finding to close; the findings below that A0 did not point me at (F1, the
  referential channel; F3's README case name) are the ones to weigh this file by.

What it **does** weaken, and I cannot fix from inside:

- **Framing.** A0 chose the subject and the questions. I pressed on those and worked outward; §9
  lists what I did not review and cannot list what neither of us thought of.
- **Shared blind spots.** Where A0's reasoning about PostgreSQL is wrong in a way characteristic of
  this model, I am the least likely reader to catch it. The protection is the same one the batch-081
  review had: a database. Every claim in §§1–4 that could be executed was executed.
- **Worth of the signature.** The Owner's Q6 asks for this run precisely because a batch by the
  package Author has no other independent reader. A same-vendor subagent is the mechanism Q1
  authorised, and it is the weakest form of it. I say so rather than pretend otherwise.

**Two corrections to the brief, because it said to follow the tree and not the brief.**

1. `brief-common.md` says no PostgreSQL is available on this machine; `brief-111.md` says that is
   false, and the tree agrees with the second: `/opt/homebrew/opt/postgresql@17/bin/postgres --version`
   → `postgres (PostgreSQL) 17.11 (Homebrew)`. The user's own server on `localhost:5432` was not
   touched. What I ran is in §8.
2. The brief says 111's base is `cb6fa13` "after PRs #121–#139" and that main has since received
   nothing that touches its tables. True — `git merge-base` is `cb6fa13` and `main` has not moved
   during this review — but one fact the brief does not state matters to the S8 question below:
   **`083_content_targets_service_path_closed.sql` is on `main`** (PR #117 merged 081 and 083
   together, `git log --oneline main -- db/foundation/migrations/081_content_targets.sql`), so
   A1-081 S1's stop-the-line is closed on the base 111 sits on. §4 measures that 111 leaves it closed.

---

## 1. Verdict on the primary thread, in one sentence

> **The key closes A1-081 S3 fully: `content_targets_social_scope_fk (workspace_id, social_account_id)
> → app.social_accounts (workspace_id, id)` is validated, `MATCH SIMPLE` over two `NOT NULL` columns,
> refuses tenant A's editor a target aimed at B's account (P3a, `23503`) and tenant B's owner a target
> aimed at A's account (P3b, `23503`), admits an own-Workspace destination (P3f), and cannot be reached
> with another tenant's `workspace_id` at all because the INSERT policy answers first (P3d, `42501`);
> without 111 the same suite reports `the database accepted the row (1 returned)` on the new case,
> which is S3 reproduced. Batch 111 writes no policy and no grant, so it has no S8 shape to find, and
> it leaves 083's closure on `content_targets` and 110's empty policy set on `social_accounts` exactly
> as they were.**

---

## 2. FINDING F1 — LOW. The key is a new path from a client to a table it cannot read, and it carries one bit about the client's own Workspace

**What is reachable now that was not.** Before 111 an `authenticated` caller had no path of any kind
to `app.social_accounts`: no grant (`110_meta_connector.sql:890-893`; P2c/P2d show `app_worker` and
the owner only), no policy (P2: the table has none), measured as `42501 permission denied for table
social_accounts` for owner A (P5). After 111, the same caller's INSERT on `content_targets` is
answered by a referential-integrity check against `social_accounts` that runs as the table owner and
bypasses row level security — PostgreSQL's documented rule for RI checks, and the one the batch-080
and batch-081 reviews already priced for `content_targets_active_destination`.

**What the channel says, measured.**

| probe | caller | row | answer |
|---|---|---|---|
| P3f | owner A | `(workspace_a, business_a1, content_item_a1_page)` aimed at `social_account_a2` (own Workspace, a pair the fixture does not hold) | `INSERT 0 1` |
| P3c | owner A | same, aimed at `00000000-0000-4000-8000-000000000001` (no row anywhere) | `23503`, DETAIL `Key is not present in table "social_accounts".` |
| P3a | editor A | same item, aimed at `social_account_b1` (a real row, in B) | `23503`, DETAIL identical to P3c |
| P3d | owner A | `workspace_b`'s scope, aimed at `social_account_b1` (a pair that exists in B) | `42501 new row violates row-level security policy`, `ExecWithCheckOptions, execMain.c:2202` — the key was never consulted |

So a caller the INSERT policy admits — owner, admin or editor of Workspace W
(`081_content_targets.sql:283-289`) — can learn whether a uuid **it already holds** names a social
account **of W**. It cannot learn anything about another Workspace (P3a and P3c are byte-identical;
P3d shows the policy is evaluated before constraints and before RI triggers, so a foreign
`workspace_id` never reaches the check), and it cannot learn key values: the DETAIL omits them
(`Key is not present in table`, `ri_ReportViolation, ri_triggers.c:2610`) because the caller holds
no SELECT on the referenced columns — the server's own redaction, not the batch's.

**Why LOW and not a defect.** One bit, about the caller's own tenant, for a 122-bit uuid the caller
must supply. §8.3 grants this same client class a *health projection* of the connector, which is
more than this channel yields, and `content_targets_active_destination` (081, unchanged) already
answers `23505` to the same caller for the same column. Named so the next batch prices it rather than
discovers it: **the next reviewer should refuse** a `SELECT` grant on `app.social_accounts` to
`authenticated` offered "so the 23503 is legible" — the redaction is doing its job.

---

## 3. FINDING F2 — LOW. The suite measures the key in one direction; the other direction is measured here and owed to nobody in particular

The one case the batch adds — `editor-a-cannot-aim-a-content-target-at-another-tenants-destination`
(`isolation-cases.mjs` on the branch, the hunk at `@@ -12335,12 +12335,27 @@`) — is A→B: tenant A's
editor, B's account. There is no B→A case. The constraint is one definition over both tenants' rows,
so the asymmetry is in the measurement and not in the control; P3b measures the other direction
(owner B, `content_item_b1`, aimed at `social_account_a2` → `23503`) and it holds. The batch's own
evidence (`a0-batch-111-social-fk-2026-09-15.md` §2) claims "both tenants" only by construction. A
second case would cost one entry and make the claim a measurement; I record it and do not write it.

---

## 4. Tenant isolation, deny-by-default, and the S8 question — reviewed, nothing open

**Does this batch have the S8 shape?** No, and the answer is structural rather than a reading:

- `grep -n -i -E "grant|revoke|policy|bypassrls|owner to|force row|disable row|security definer|alter role" 111_social_fk.sql`
  matches one comment line (`:22`, the words "ON DELETE action") and nothing else. The batch writes
  three DDL statements (`:41-42`, `:45-46`, `:48-54`), one comment (`:56-59`) and one assertion
  block (`:61-110`). It creates no table, so RFC-2026-016's FORCE rule and RFC-2026-022's
  classification have nothing new to bind.
- **`app.content_targets` after 111** (P2): five policies — 081's three permissive `TO authenticated`,
  081's restrictive narrowing `TO authenticated`, and 083's `content_targets_service_path_closed`
  with `polroles = {-}` (PUBLIC), restrictive, `for all`. `relrowsecurity t`, `relforcerowsecurity t`,
  owner `postgres` (P2b). Unchanged by 111; the S8 shape A1-081 S1 found is closed on the base and
  stays closed.
- **`app.social_accounts` after 111** (P2, P2b): ENABLE + FORCE, **no policy at all**, owner
  `postgres`. An empty policy set under FORCE denies every non-bypassing role including the one
  holding grants (`app_worker`, P2d), which is 110's design and not the S8 shape — there is no
  `to authenticated` narrowing here because nothing admits `authenticated` at all.
- **Grant layer** (P2c, P2d, P2f): `content_targets` — `authenticated` column-scoped SELECT (12),
  INSERT (8), UPDATE (4: `deleted_at, status, updated_at, updated_by`); `social_accounts` —
  `app_worker` SELECT (8), INSERT (6), UPDATE (`display_name`); nobody else on either. `anon`,
  `app_command`, `app_maintenance` and the shim's `service_role` hold no USAGE on `app`; `app_authz`
  and `app_worker` hold USAGE and nothing on these two tables beyond the above. No role has
  `rolbypassrls`. DELETE on `social_accounts`: the owner only (P2e counts one grantee; P2c names it
  `postgres`). 111 adds and removes nothing here; the sets are 081's and 110's.

**What the key binds that policies do not.** A foreign key is enforced by RI triggers for every
role, owner or not, `BYPASSRLS` or not, and no policy shape exempts a writer from it. So 111 is the
first control on `content_targets` that a future `app_command` writer cannot slip past by the S8
mechanism. What it binds is narrower than the sentence invites: **(workspace_id, social_account_id)
consistency**, not the writer's tenant. A command writer landing a row under `workspace_b` with one
of B's accounts satisfies the key; what refuses that today is 083's closure, and what should refuse
it in the end is shape B, the acting-user narrowing owed as an RFC (`083:9-16`). 111 neither claims
nor changes that.

**The referenced side cannot move or vanish through a granted path.** `app_worker`'s UPDATE grant is
`display_name` alone (P2d; P6 measures `42501` on an UPDATE of `workspace_id`), and no non-owner
holds DELETE (P2e), so `ON DELETE NO ACTION` / `ON UPDATE NO ACTION` (P1: `confdeltype a`,
`confupdtype a`) are never exercised through a client or service path today. The batch records the
delete question as undecided (`111:22-25`, evidence §4) rather than choosing `CASCADE` or
`SET NULL` — the right refusal: a cascade from a connector table into content rows would be an
irreversible deletion path nobody has approved, and `SET NULL` is impossible on a `NOT NULL` column.

**No null-skip.** `confmatchtype s` (MATCH SIMPLE, P1) with both columns `attnotnull t` (P1b), so the
skip that makes 081's nullable pin legal has no null to act on here. Not deferrable (`condeferrable
f`), so the check is per statement, as the batch says (`111:25`).

**Validated, and asserted validated.** `convalidated t` (P1); `111:66-83` asserts it against
`pg_constraint` by name, column order (`conkey`/`confkey` compared to the two arrays), referenced
table and validity; `111:85-98` asserts no second key involves `social_account_id`; `111:100-109`
asserts the supporting index leads with the key's columns (P1c: `content_targets_social_scope_idx
(workspace_id, social_account_id)`). `schema-lint`, which asks every FK for a supporting index
(`scripts/db/run.mjs:77`), passes on the branch (§8) and in CI.

**The three repairs RFC-2026-017 §4 forbids** — `BYPASSRLS`, dropping `FORCE`, making `app_command`
the owner — none taken: grep above (zero tokens), P2b (owner `postgres`, FORCE on both tables), P2f
(`rolbypassrls f` for every service role).

---

## 5. The retired symbols, the repoint, and 110's fixture

**Does any case, fixture or test hold a uuid that names no row?** No.

- The three retired uuids (`3e4c57c4-…`, `7d07fdd8-…`, `5ef9c641-…`): `grep -rn` over the branch's
  tree excluding `evidence/` → no match. The retired symbol names: `git grep -n content_target_destination
  origin/agent/claude/WP-0A-DB-00-batch-111 -- .` outside `evidence/` → prose only (three catalog
  `role` texts naming what each symbol *was*, the catalog's `_no_symbol_…` note, and the manifest's
  kept `[ORIGINAL ENTRY FOLLOWS]`). Every executable reference is renamed.
- The three new uuids are the catalog's own recipe: `uuid5(DNS, 'thinkbizthai.fixture.<symbol>')`
  recomputed in Node gives `71b10fff-…`, `f8d7b988-…`, `bf855f7a-…` for `social_account_a1/a2/b1`, and
  `c4840acc-…` for `workspace_a` as the control that the namespace is the right one; all four match
  `fixture-catalog.json` on the branch.
- After the suite and every probe, `content_targets` holds six rows, `social_accounts` three, and
  **zero targets whose `(workspace_id, social_account_id)` names no account** (P7) — the load-time
  proof that the repoint is complete, and the one the batch says the fixture would refuse to give
  without it.

**Does 110's fixture change weaken what 110's cases prove?** No.

- The ids are now supplied (`110-meta-connector-fixture.sql` on the branch, the hunk at
  `@@ -80,11 +80,21 @@`); the `ON CONFLICT` target is unchanged — `(workspace_id,
  external_account_hash)`, the arbiter 110 chose. A second `rls-smoke` on the same database (a second
  load of every fixture) passed 845, so the fixed ids do not break idempotency: the arbiter conflict
  fires before the primary key or 111's new unique key are reached.
- The a/b pair still shares one hash and the composite-key proof still rests on it (P8:
  `hash_is_symbol_digest t` on all three; a1 and b1 digest the same symbol, a2 its own). The static
  rule that pinned "two accounts, one hash" now pins three with `[0] == [2]` and `[1] != [0]`
  (`identity-isolation.test.mjs` on the branch, hunk `@@ -5538,8 +5538,11 @@`). A key that lost
  `workspace_id` would still fail to load.
- 110's cases are about a table that admits nobody; a third row in `workspace_a` is one more row the
  service sees zero of. The head CI run's negative control on `app.social_accounts` noticed 2 cases
  (`service-sees-zero-social-account-rows` first), as before.
- The new row is synthetic in every column (P8: `ig`, `fixture social account a2`, a digest of its own
  symbol). No token-shaped column exists on the table (`110:468-502`) and
  `node scripts/scan-repository-secrets.mjs` on the extracted tree exits 0.

**The case name is load-bearing and the batch got it right where it counts.** The CI negative
control for 110 matches `[a-z0-9-]*social-account` (`.github/workflows/ci.yml:459`); a case named
`…-another-tenants-social-account` would be counted as a 110 case and, since disabling RLS on
`social_accounts` does not make a foreign key admit a row, it would never be *noticed* there — a
control entry resting on a case that cannot fail. The batch named it `…-destination` and says why
(evidence §2). See F3 for where the other name survived.

---

## 6. FINDING F3 — LOW (record). Sentences the repoint leaves false in place, and a README that names a case the suite does not contain

None of these is a control; every one is a sentence a reader will meet before the code that
contradicts it. None is in an integrated migration, so each can still be corrected in place.

| where (on the branch) | says | is now |
|---|---|---|
| `tests/db/identity/fixtures/081-content-targets-fixture.sql:13` | "THE THREE DESTINATION SYMBOLS NAME NO ROW IN THIS REPOSITORY, AND THAT IS THE POINT" | they name three rows; the point has moved |
| same file `:15` | "`content_targets.social_account_id` carries NO FOREIGN KEY" | it carries `content_targets_social_scope_fk` |
| same file `:31` | "the day batch 111 adds the foreign key, THIS FIXTURE STOPS LOADING" | that day is this branch and it loads |
| same file `:158` | "the column is resolved against nothing at all" (the b1 row's comment) | resolved against `social_accounts (workspace_id, id)` |
| `tests/db/identity/fixtures/110-meta-connector-fixture.sql:42` | "two social accounts — one `fb` under each connection, sharing an external account hash" | three; the header's row table omits the `ig` row |
| same file `:75` | "No id is supplied and no symbol exists for either" | six lines above "THE IDS ARE FIXED SINCE BATCH 111" |
| `tests/db/identity/identity-isolation.test.mjs:9457-9462` | the message on `assert.doesNotMatch(fixture, /from app\.social_accounts/)`: "THE DESTINATIONS RESOLVE TO NOTHING, ON PURPOSE … Batch 111 must repoint all three" | the assertion is still right (no subselect; the ids stay catalog constants) and its reason is now the opposite one |
| `db/foundation/README.md:159-160` (the paragraph the batch added) | names the case `editor-a-cannot-aim-a-content-target-at-another-tenants-social-account` | the case is `…-at-another-tenants-destination`; `grep -c` of the README's name in `isolation-cases.mjs` on the branch → 0 |

The README entry is the one worth a second look: it is the name the batch deliberately did *not*
use (§5, last paragraph), written into the document a reader opens to find the case. The batch's
migration header (`081:14-32`, `:222`) and the manifest's original blocker are integrated or kept on
purpose and are named as such by 111 (`111:5-7`, manifest `:375`); they are not in this table.

---

## 7. RFC-2026-021, RFC-2026-022, and what the batch declines to classify

- **Read allowlist (RFC-2026-021).** 111 creates no view, grants no SELECT, adds no entry, and the
  redaction in F1 keeps the key from becoming a read of `social_accounts` by another name. Nothing
  owed. §7/4 (`anon` nothing): P2f `app_usage f`.
- **Service-policy map (RFC-2026-022).** 111 creates no table and writes no policy, so it has no `S`
  cell to classify; `db/foundation/lint/service-policy-map.json` is not in the diff and
  `servicePolicyMapCheck` (part of `schema-lint`, `run.mjs:1236`) passes on the branch and in CI.
  The absence is correct. RFC-2026-022 §3's table hands "the delivery is against a known target" to
  batches 120/121; 111 is what makes the target *known* at the database, and the batch says it
  anticipates nothing of 120 (evidence §4). A1-081 S3 asked for one sentence in the record — that no
  publisher may read `social_account_id` before 111 lands — and that sentence is now moot rather
  than written: 111 is on the queue ahead of 120, and the key is a precondition 120 will find met.
- **Catalog declaration.** `catalog-snapshot.json` adds `111_social_fk.sql` to the tail between
  `110` and `130` and edits the `why` text; the tail stays contiguous, the lint accepts it (§8).
- **Ownership (for the Reviewer, not decided here).** 111 edits A6's fixture and A6's static rule
  for 110, and A3's fixture for 081. The manifest rationale on the branch says every such path is in
  DB-00's `writable_paths`; whether an integration batch may rewrite another owner's fixture header
  (F3 shows it rewrote the rows and not the header) is C0's question.

---

## 8. What I measured, where, and what I did not

**The scratch cluster.** PostgreSQL 17.11 (Homebrew), `initdb -U postgres --auth=trust -E UTF8
--locale=C`, started with `-p 5503 -c listen_addresses=127.0.0.1 -c unix_socket_directories=''`,
database `thinkbizthai_test`, `db/foundation/ci/supabase-shim.sql` applied first as
`.github/workflows/ci.yml:134` does. The tree measured was `git archive
origin/agent/claude/WP-0A-DB-00-batch-111` extracted to the scratchpad (`tree-111`), and a second
copy with `111_social_fk.sql` deleted (`tree-no111`). Commands, all with
`DB_TEST_URL=postgresql://postgres@127.0.0.1:5503/thinkbizthai_test LC_ALL=C TZ=UTC PGTZ=UTC`, via
`node scripts/db/run.mjs <target>` (not `make`, per the brief):

| cluster | tree | command | result |
|---|---|---|---|
| 1 (fresh) | `tree-111` | `migrate-clean` | `applied 111_social_fk.sql` … `db-migrate-clean: ok in 716ms` |
| 1 | `tree-111` | `schema-lint` | `db-schema-lint: ok in 25ms` |
| 1 | `tree-111` | `rls-smoke` | **`db-rls-smoke: 845 isolation case(s) passed.`** (`ok in 868ms`) = 844 on `main` + 1 |
| 1 | `tree-111` | `rls-smoke` again, same database | `845 isolation case(s) passed.` — the fixtures load a second time (§5) |
| 1 | — | probes P1–P8 (`scratchpad/a1-111-probes.sql`, output kept beside it) | §§2–5; every write inside `begin … rollback`; P7 re-counts the fixture afterwards: 6 / 3 / 0 orphans |
| 2 (re-`initdb`, because 001 creates cluster roles) | `tree-no111` | `migrate-clean` | `applied 110_meta_connector.sql`, `applied 130_billing.sql`, `ok in 691ms` — 111 absent |
| 2 | `tree-no111` | `rls-smoke` | **`db-rls-smoke: FAILED — 1 of 845 case(s)`**: `editor-a-cannot-aim-a-content-target-at-another-tenants-destination … the database accepted the row (1 returned) and had to refuse it with 23503` — A1-081 S3 reproduced on this base |

Both clusters were stopped (`pg_ctl … stop -m fast`) and the data directory removed before
`npm run verify` ran. Three `\echo` labels in the probe file contain an apostrophe and psql cut them
(`unterminated quoted string`); the statements under them ran and are the ones cited.

**One incident, recorded because a sibling run may have met it.** My first `initdb` targeted
`<scratchpad>/pg-scratch` rather than `<worktree>/pg-scratch` as the brief says. That directory had
been initialised two seconds earlier by another role run sharing the session scratchpad; my
`pg_ctl start` on it succeeded on port 5503 at 04:51:53 +07 and the other run's own start at 04:51:54
failed with `lock file "postmaster.pid" already exists` (its `server.log`). I dropped the one
database I had created there, stopped that postmaster within minutes, and re-initialised in my
worktree. Nothing of mine was measured on that directory; a sibling whose first `pg_ctl start`
failed at that time should simply retry.

**CI.** Run `34900710795` on head `7129174`, `conclusion: success`, measured on the branch name
(`✔ the handoff for this branch describes this branch`; no `detached HEAD` line): `ℹ tests 641 /
pass 641 / fail 0`, `applied 111_social_fk.sql`, `db-migrate-clean: ok in 1862ms`,
`db-schema-lint: ok in 62ms`, `db-rls-smoke: 845 isolation case(s) passed.`; negative control
`app.content_targets (081): 15 case(s) noticed`, `app.social_accounts (110): 2 case(s) noticed`.
The local run agrees with it on every number.

**Verify on this branch.** `npm run verify` on `agent/claude/WP-0A-DB-00-a1-security-111` with this
file present printed:

```
clean: exit 0 — tests 641, pass 641, fail 0, skipped 0, todo 0
```

That is `main`'s suite plus this file; it is not a measurement of the batch (the batch's 641 is CI's
line above). `npm run check:scope` is not cited, per the brief.

---

## 9. What I did NOT review

- **I did not hand-simulate the 845 cases** or the 42 repointed references one by one; I ran them
  (845, twice), read the new case and the helper it uses (`contentTargetAim`,
  `isolation-cases.mjs:15504-15511`), and re-derived the 23503 with my own statements (P3a–P3f).
  Whether every renamed case still tests what its `why` says is the Tester's brief.
- **The static suites on the branch** (`641` in CI; the batch cites 285 identity + 58 contract). I
  read the diff of the rules that changed and did not re-run them locally; CI's `641 / 0` is cited.
- **Workspace-scoped versus Business-scoped** (`111:20-22`): whether a target under `business_a2`
  should be able to aim at an account "of" `business_a1` is a product rule inside one tenant, not
  isolation. I read the batch's §4 reasoning and did not check it against the ERD document.
- **The `NO ACTION` decision and the absent deletion case** — priced in §4 as unreachable today;
  whether it is the right long-term answer is the Reviewer's and the Owner's.
- **Batch 120/121's use of the key.** Nothing on this branch is about them.
- **The platform.** Measured on a shim'd PostgreSQL 17.11 where `postgres` is a bypassing superuser
  and `service_role` is not; RFC-2026-017 §2's measurements of the real instance are not re-taken.

---

## 10. Summary and verdict

| # | severity | one line |
|---|---|---|
| F1 | LOW | The RI check is a new one-bit channel from an admitted writer to `social_accounts`, confined to the caller's own Workspace, values redacted; priced, not a defect. Refuse a SELECT grant offered to "make it legible". |
| F2 | LOW | The suite measures A→B only; B→A measured here (P3b) and holds. One case would make the batch's "both tenants" a measurement. |
| F3 | LOW (record) | Seven sentences in two fixtures and one static-rule message now say the opposite of the code beneath them; the README names a case that does not exist. |

No HIGH. No MEDIUM. **Stop-the-line: no** — on no finding. The test from `CONTRIBUTING_AGENTS.md`
and the brief is *does a control the repository believes it has fail to exist*; here the repository
believed a control was **missing** (081's header, the manifest blocker, A1-081 S3) and this batch
makes it exist, and I measured it existing (P1, P3a, P3b, P7) and measured its absence failing the
same suite (cluster 2). Nothing this batch touches loosens a policy, a grant, FORCE, or ownership
(§4), and the S8 shape is absent because there is no policy here to have it.

**What the next reviewer should refuse**, in order of likelihood:

1. A `SELECT` grant on `app.social_accounts` to `authenticated` justified by F1's redacted DETAIL.
2. An `ON DELETE CASCADE` added later "to make the delete question go away" — from a connector table
   into content rows, with no approved deletion manifest, that is the irreversible-deletion class.
3. A permissive policy naming `app_command` on `content_targets` that carries no scope predicate,
   on the argument that "the foreign key bounds the destination now" — it bounds consistency, not
   the writer's tenant (§4); 083's closure and the owed shape B are what bound the writer.
4. Merging 111 with F3's README name uncorrected, if only because the next person to grep for the
   case will conclude it was never written.

**What this file signs: nothing.** It is one of the role runs Q6 requires and it records that the
Security/Privacy reader found no stop-the-line and three LOW findings; the Reviewer's and Tester's
files are theirs, and `security_reviewer_agent_run_id` is the manifest's to fill.
