# C0 contract review — the pre-080 closure set: batches 022, 031, 042, PR #144 (Draft for the Owner)

Run: `/claude/c0_contract_reviewer_pre080`
Role: independent Reviewer, as named in `work-packages/WP-0A-DB-00.json`
`role_assignments.reviewer_agent_run_id`, run as a distinct run under the Owner's Q1 disposition.
This document **records findings**. It advances no package status, decides nothing that is the
Product Owner's to decide, and repairs nothing it found.
Date: 2026-09-15.
Subject: `origin/agent/claude/WP-0A-DB-00-pre-080-closures`, head `9d5664d`, commits `60b69b4`,
`56a840d`, `9d5664d`; PR #144, Draft, base `main`.
Base of this review: `main` = `4499344` (= `origin/main`; `git merge-base` with the branch is the
same commit, so the branch sits on today's `main` and `git merge-tree --write-tree` produces a
tree with no conflict).

---

## 0. What I am, before anything else

I am a subagent spawned by `/claude/a0_atlas` — the run the manifest names as this package's
Author **and the author of the three files reviewed here** — and I run in the same vendor and
model family as it (Anthropic, Claude Fable 5.1). A0 wrote the three briefs I was handed, chose
that I would review this set, and chose what to point me at: the S8 map's premise, RFC-2026-022 §3,
the grants in 020/021/030/040/041, every permissive policy's TO clause on the seven tables, the
closure precedents 082/083/092/101, the static rule `SERVICE_PATH_CLOSURES`, and the four things
the batch deliberately leaves open. The Owner withdrew the cross-vendor condition on 2026-09-15
(Q1) and ordered same-vendor role runs (Q6); under that decision a distinct run in the named role
counts as that role's signature. I am a distinct run. I am not A0, and where this document and
A0's record disagree, the tree decides: every claim below carries the command or the `file:line`
a reader needs to re-run it.

What the shared model does not weaken: a `grep`, a byte count, a blob id, a `pg_policy` row, a
suite left green or turned red by a one-line mutation, a `count(*)` as `app_worker`. A shared
model does not make `020_business.sql:452` grant `app_worker` INSERT and UPDATE on
`business_profiles`; it does, and `has_table_privilege` on a live PostgreSQL 17.11 says so (§3/P2).

What it does weaken, and I cannot fix from inside: A0 chose the threads. The finding I rate
highest (**M1**) is about a document A0 wrote and pointed me at as the premise, and it is the kind
of finding a shared-model reviewer is *most* likely to make — reading the tree and comparing — and
the kind a non-reader would have missed. §5 lists what I did not check.

Two corrections to the briefs, recorded here rather than silently followed (§1): the common brief
says no PostgreSQL is available on this machine, and that is false — the subject brief corrects
it, and everything in §3 that says "measured" was measured on a scratch cluster of my own on
`127.0.0.1:5522`, never on the user's server at `/tmp:5432`, which I did not connect to. And the
sibling role runs share this session's scratchpad, so every file I exported from the branch was
compared against the branch by `git hash-object` = `git ls-tree` blob id before I relied on it
(§6); the seven blob ids matched.

---

## 1. Corrections to the briefs I was handed

1. **"No PostgreSQL is available on this machine" (brief-common) is false.** Homebrew
   `postgresql@17` 17.11 is at `/opt/homebrew/opt/postgresql@17/bin`. The subject brief says so
   and assigns me port 5522; every live claim in this file is from that scratch cluster (fresh
   `initdb` per run, `db/foundation/ci/supabase-shim.sql` applied, stopped and deleted before this
   file was committed). The brief's fallback — "documented PostgreSQL 17 semantics plus the
   branch's CI run" — is cited beside the measurements, not instead of them.
2. **The subject brief's expected numbers are all as stated**, and I record that as a
   measurement rather than an assumption: 847 on `main`, 854 on the branch, 7 of 854 failing with
   the three files removed, identity suite 285, contract suite 60, `npm run verify` 643 (§3, §6).
3. **The brief-reviewer's "byte budget" no longer exists as a size cap.** Batch 100's budget was
   replaced by A0's stdin fix (`test-kits/db/foundation-contract.test.mjs:2015-2050`: the driver
   feeds psql on stdin, a 200,000-byte probe is applied on every `migrate-clean`, and the one
   surviving rule is "no psql meta-command in a migration"). I measured the sizes anyway (§3).

---

## 2. Findings

Severity: HIGH — the batch or its premise says something untrue that a decision rests on;
MEDIUM — a claim the tree contradicts, or a control that reads as present and is not; LOW —
imprecision, inheritance, hygiene. No finding here is stop-the-line (§4).

### M1 — MEDIUM. The S8 map — the batch's stated premise — understates `app_worker`'s grants in all three of the rows it reads as closable

The three headers (`022:6-8`, `031:6-8`, `042:6-8`), the seven cases' `why`
(`isolation-cases.mjs` on the branch `:12786-12788` and siblings), the author's evidence file
(§0, §1) and the manifest's new blocker all rest on
`evidence/WP-0A-DB-00/a0-pre-080-families-s8-map-2026-09-15.md` §2/§3 row 1. That map's
column "`app_worker` grants today" reads:

| map row (`:13-15`) | map says | tree says |
|---|---|---|
| business/page (020, 021) | "SELECT on all four (grants, no policy)" | `020:452-455`: **SELECT, INSERT, UPDATE** on `business_profiles` and `page_context_profiles`; **SELECT, INSERT** on both version tables |
| industry (030) | "SELECT on `industry_packs`, `industry_pack_versions`, `industry_assignments`" | `030:459-460`: SELECT on the two global tables; `030:485`: **SELECT, INSERT, UPDATE** on `industry_assignments` |
| knowledge (040, 041) | "SELECT on both" | `040:529-530`: **SELECT, INSERT, UPDATE** on `knowledge_items`; **SELECT, INSERT** on `knowledge_item_versions` |

Live (§3/P2, P11): `has_table_privilege('app_worker', …)` is true for INSERT on all seven tables
and for UPDATE on four. The map's next column — "What a closure would refuse: a worker read that
no policy admits today anyway" — is therefore incomplete in the same direction: a closure also
refuses a future permissive worker **INSERT/UPDATE** policy, and §3/P7 shows the closure doing
exactly that by name (`new row violates row-level security policy
"industry_assignments_service_path_closed"`).

**Why the conclusion survives, and why this is still MEDIUM.** The premise that matters is not
"SELECT only" but "no `S` cell and no permissive policy admits the worker", and both hold:
RFC-2026-022 §3's table (`:173-183`) names nine `S` cells and none is on these families; §8.1
gives Service `P` on "Business/Page SELECT" and "Business/Page INSERT/UPDATE/archive" and `N` on
version mutation (`sprint-0a-core-erd-rls-retention-th.md:347-349`); §8.2 gives `P`/`P`/`N` on the
three knowledge rows (`:355-357`); and 020, 030 and 040 each assert at apply time that no policy
on their tables names a service role (`020:641-644`, `030:746-748`, `040:908-910`), which §3/P1
confirms on the catalog: all 26 permissive policies on the seven tables admit `authenticated`
alone. So "closable now" is right. But the map is on `main`, it is the document the Owner is
asked to decide from, it is wrong on the tree in three of three rows in the one column that says
what a closure costs, and the batch that relies on it did not correct it — the migration headers
(`022:24`, `031:24`, `042:24`) state the grants correctly and cite the map in the same breath.
A reader who trusts the map will think the closure changes less than it does. **Owed to A0:** a
correction to the map's §2 table (a docs increment, or the same PR), so that the Owner's record
and the tree agree.

### L1 — LOW. Seven catalog cases prove the closures exist; nothing in the suite exercises the refusal (inherited from 082)

Each new case (`isolation-cases.mjs` branch `:12779-12862`) runs `SERVICE_PATH_CLOSURE_ON`
(`:15390-15392` on the branch; `:15306-15308` on `main`) as `ownerA` and asks `pg_policy` for a
restrictive, `FOR ALL`, `TO PUBLIC` policy on the table. It does not read the predicate (the
static rule and the apply-time block do), and no case in the 854 makes a service role with a
permissive policy meet the closure. The refusal is measured only by hand — the author's replay in
the evidence file §2 and mine in §3/P4-P8. This is the same gap 082/083/092/101 carry, and it is
the reason a Tester's independent replay matters for this set as it did for 082. Not a defect in
what the batch claims — the cases' `why` says "reads that policy back" — but a limit of what
"854 passed" proves.

### L2 — LOW. The `covers` tag cites §8.5 for a cell that lives in §8.1 and §8.2

All seven cases carry `covers: ['§12.6/2', '§8.5/service-P-closed']`. §8.5 is "Mandatory RLS
patterns" (`:404-415`); the Service `P` cell being closed is in §8.1 for business/page and
industry (`:347-348`, and industry inherits the Business cells per `030:492`) and in §8.2 for
knowledge (`:355-356`). 082 and 083 tag `§8.2/…` and 092 tags `§8.3/…` — the matrix section
of their family; 101 tagged `§8.5/…` for asset rows that are in §8.2, and this batch copied 101.
No rule validates the tag (`identity-isolation.test.mjs:544, 1702, 2316…` collect `covers` to
assert presence, not validity), so nothing fails; a coverage reader that groups cases by section
will mis-file eleven of the seventeen closure cases on the branch (`grep -o` → §8.2: 3, §8.3: 3,
§8.5: 11).

### L3 — LOW. `service_roles` is declared in all three apply-time blocks and read by none (inherited from 101)

`022:79-80`, `031:52-53`, `042:59-60` declare `service_roles constant text[]`. 082 used it in its
claim 3 (`082:153-154`, `:247`); these three take 101's claim 3 instead (`022:146-165`), which
never references it. `101_asset_service_path_closed.sql` has the same dead declaration
(`grep -c service_roles` → 1, the declaration only). PL/pgSQL does not object. A reader who
searches for where the five roles are asserted will find a list that asserts nothing.

### L4 — LOW. Two attributions in 022's header are one batch off

`022:3-4`: "Closes the S8 shape in batch 020 and 021: narrowings `for all to authenticated`" —
020 writes no restrictive policy; all four narrowings are 021's (`021:595-618`).
`022:24`: "batches 020 and 021 grant app_worker SELECT, INSERT and UPDATE on the two profile
tables…" — 021's only worker grant is on `workspace_member_scopes` (`021:357`); the four grants
are 020's (`020:452-455`). Both sentences are right about *what* and wrong about *which file*.

### L5 — LOW. "app.workspace_member_scopes is … not a narrowed one" (`022:31`) is no longer true of the catalog

Since batch 102, `workspace_member_scopes` carries `workspace_member_scopes_updated_by_is_caller`
— RESTRICTIVE, INSERT-only, `to authenticated` (`102_updated_by_is_caller.sql:41-43`; live §3/P12).
It is not the S8 shape: 102's header says it is ANDed with the client INSERT policy and "widening
nothing", and it claims nothing about a service writer. But "not a narrowed one" is the wrong
reason for leaving the table open; the right one — the table has no scope narrowing that claims to
bound a writer, and the map's §3 calls it an `app_authz` question — is the sentence's second half.
The same 102 policies sit on `business_profiles`, `page_context_profiles`, `industry_assignments`
and `knowledge_items` (`102:35-48`) and are covered by the closures.

### L6 — LOW. The author handoff carries a truncated sentence

`handoffs/WP-0A-DB-00-author-handoff.json` `assumptions[0]` on the branch reads "…app_worker
grants no policy admits, narrowings . It is a DRAFT…" — a clause with no object. The handoff is
A0's artifact and is refreshed by A0; recorded so it is not carried into the merge as is.

### L7 — LOW. The files were generated by tooling outside the repository, and it shows

The map's §4 says the closures are produced by `gen-closure.mjs`, "this session's scratchpad
tooling, not in the repository". The three files carry template-expanded lines of 212, 194, 221
and 216 characters in 022 (`:24, :31, :147, :164`), 202 and 216 in 031, 265 and 274 in 042
(`:24, :127`); 082's longest line is 208. Nothing lints line length. The point is
reproducibility: a fourth closure (062/071, which the handoff already names as next) will be
generated by a tool nobody can read from the tree. Either check the generator in under
`scripts/db/` or say in the header that the file is hand-maintained from here.

---

## 3. Threads that check out — measured

Scratch cluster: PostgreSQL 17.11 (Homebrew, aarch64), `initdb --locale=C -E UTF8`, port 5522,
`listen_addresses=127.0.0.1`, no Unix socket, `supabase-shim.sql` applied; fresh cluster before
each of the four `migrate-clean` runs below because 001 creates cluster roles. Files placed in
this worktree for the branch runs were produced by `git show <ref>:<path>` and their
`git hash-object` equals the branch's `git ls-tree` blob id for all seven (§6). The branch was
never checked out.

**The premise, against the tree.**

- RFC-2026-022 §3 table (`architecture/decisions/RFC-2026-022-service-policy-shape.md:173-183`):
  nine `S` cells — audit INSERT (140), research INSERT (070), publish INSERT (120/121),
  notification (051), usage ledger (061), security event SELECT (140), job claim (050), raw
  token/webhook SELECT (110/131), asset purge (100/160). None is business/page, industry or
  knowledge. §8.1 and §8.2 of the RLS document agree (`:337-367`): Service is `P` on every
  business/page and knowledge operation and `N` on version mutation.
- Every permissive policy on the seven tables is `to authenticated`: by text
  (`020:477-560`, `021:648-715`, `030:507-575`, `040:551-627`, `102:35-48`; `grep` of every
  `create policy … on app.<table>` across `db/foundation/migrations/*.sql` finds no other TO) and
  by catalog (P1: 26 permissive policies, `admits = authenticated` on every row).
- The seven narrowings are `as restrictive for all to authenticated` and resolve through
  `app.member_scope_admits_business/page` (`021:595-618`, `030:596-600`, `040:657-690`) —
  `security invoker` helpers reading `app.workspace_member_scopes` (`021:389-400`), EXECUTE
  revoked from PUBLIC and granted to `authenticated` alone (`021:505-515`). So 082's argument
  against naming `app_command` in a narrowing (`082:47-55`) transfers unchanged.
- `app_worker`'s privileges on the seven (P2, P11): SELECT and INSERT on all, UPDATE on four —
  more than the map says (M1), and none admitted by any policy. No other service role and no
  `anon` holds anything on the seven (P11 lists every service-role privilege on ten tables:
  only `app_worker` appears). No `SECURITY DEFINER` function in `app` or `private` names any of
  the seven tables (P13: empty), so no path runs against them with `current_user ≠ authenticated`
  on a client's behalf.
- RFC-2026-022 §7 is not in effect: `app_worker`'s only member is `postgres` (P10), which
  bypasses RLS. The closure therefore binds nobody who can log in today; that is the same
  statement 082 made.

**The closures, as the catalog holds them (P0).** Seven rows, `polpermissive = f`, `polcmd = *`,
`polroles = {0}`, both halves `(CURRENT_USER = 'authenticated'::name)`. Owners `postgres`, ENABLE
and FORCE on all seven; no service role has `rolbypassrls` or `rolsuper` (P9).

**The author's probe claims, re-run.**

| claim (author evidence §2) | measured here |
|---|---|
| `main`: 847 cases | `db-migrate-clean: ok` (36 applied), `db-schema-lint: ok`, **`847 isolation case(s) passed`** |
| branch: 854 = 847 + 7 | 39 applied incl. `022`, `031`, `042`; lint ok; **`854 isolation case(s) passed`** |
| without the three files: 7 of 854 | 36 applied; **`FAILED — 7 of 854`**; the seven failing ids are exactly the seven new ones (each `(assert): nothing was visible`); the count of failed-case lines is 7, so no other case moved |
| replay on `knowledge_items`: 0 rows with closure, 5 without | P4: `probe_worker_reads … to app_worker using (true)`, `set role app_worker` → **0**; P5: closure dropped → **5** |
| static suites 285 / 60 | branch tree: identity **285/285**, contract **60/60** (`main`: 285, 60) |

Extended: P6 replays the read on `business_profiles` and `industry_assignments` → 0 and 0. P7
gives the worker a permissive INSERT policy `with check (true)` on `industry_assignments` with the
closure present: the INSERT is refused by **the closure, by name**. P8 drops the closure: the same
INSERT passes RLS and reaches the foreign-key check — which is the S8 shape on a write, measured:
030's narrowing binds nothing for the worker. Fixture counts at P3 (5/5/3/5) are what the replay
counts.

**The apply-time block fires (C0-M6, live).** With `022:113` mutated to `count_of <> 5`,
`migrate-clean` applied 10 files and stopped at 022 with `P0001: batch 022 finds 4 service-path
closures…`. The static suite cannot see this mutation (285/285) and does not claim to; the live
block does. 022 was restored from `git show` afterwards (blob `dbcc1ac…` re-verified).

**The static rule, mutated (extracted tree, `node --test`, baseline 285/285).**

| probe | file, mutation | result |
|---|---|---|
| C0-M1 | 022: `for all` → `for all to app_worker` on one closure | 283/285 — the closure rule **and** 061's "no service policy" rule |
| C0-M2 | 042: predicate → `current_user = 'app_worker'` | 284/285 |
| C0-M3 | rules: delete the `031` row of `SERVICE_PATH_CLOSURES` | 284/285 (file with no row) |
| C0-M4 | cases: `…assignment-table` → `…assignment-tabel` | **285/285 — not noticed**, correctly: the rule keys on prefix + table parameter (`:9721-9723`, `main` numbering), and the id's tail is not load-bearing |
| C0-M4b | cases: the 031 case's `params` → `['industry_packs']` | 284/285 |
| C0-M4c | cases: the 031 case's prefix → `batch-030-` | 284/285 |
| C0-M5 | 042: alter the assertion-2 sentence the rule greps for | 284/285 |
| C0-M7 | 031: `with check (true)` | 284/285 |
| C0-M8 | 042: a `grant select` inside the file | 284/285 |
| C0-M9 | rules: drop `knowledge_item_versions` from the 042 row | 284/285 |

Every mutation that changes what the closure *is* was noticed; the one that changes only a
spelling was not, and should not be.

**Shape and rules.** The three files match 082's shape by text (`SERVICE_PATH_CLOSURES` rule,
`identity-isolation.test.mjs:9692-9726` on `main`, three rows added on the branch) and by catalog
(P0). Claims 1, 2 and 4 are 082's (`022:82-144`, `:167-189` against `082:156-235`, `:257-281`);
claim 3 is 101's form (`022:146-165` against `101:146-165`), which is the right one here because
082's "no privilege" claim is false for these families and the header says so (`022:24-29`).
The migration byte ceiling is gone (§1/3); sizes are 11,490 / 9,626 / 10,325 bytes, and the
"no psql meta-command" rule passes (contract 60/60). `servicePolicyMapLint`'s closed field set is
untouched — the batch does not edit `service-policy-map.json`. **Invariant 1** holds: the diffstat
touches no merged migration; the three files are new, and the reason for a forward file rather
than an edit is stated (`022:19-22`).

**§6 registry.** `022`, `031`, `042` are not reserved (`sprint-0a-core-erd-rls-retention-th.md:253-283`
lists 020, 021, 030, 040, 041 and nothing between); the headers say so and cite 082/083/092/101 as
the same case. The families' owners are A1 Business, A2 Industry and A2 Knowledge; the closures
are A0's, as 082 was on A3's family. The manifest's `writable_paths` cover `db/foundation/**`, so
the write is inside this package by path; whether a closure on another agent's family needs that
agent's countersignature is a registry question I record and do not decide.

**Ownership, by hand.** Twelve changed paths: ten under `writable_paths` (`db/foundation/**` ×4,
`evidence/WP-0A-DB-00/**`, `handoffs/WP-0A-DB-00-*.json`, `test-kits/db/**`,
`tests/db/identity/**` ×2, the manifest), two declared as amendments
(`test-kits/branch-identity.test.mjs`, `test-kits/integrity-manifest.json`), matching the
manifest's `amends_without_owning`. `catalog-snapshot.json`'s `why` grows by three sentences,
one per batch, each placing the file in the not-applied tail where it sorts; `NOT_ON_THE_INSTANCE`
(`foundation-contract.test.mjs:330-334`) matches, and the contract suite's tail rule passes.

**Case ids and the CI control.** The seven ids match none of the workflow's control patterns
(`ci.yml:200-213`: `business`, `page`, `scope`, `industry-assignment`, `knowledge-item`,
`knowledge-version`) — checked by regex over the seven; the evidence file's reason for the
family-free ids is right. All 854 ids are unique on the branch.

**CI.** Run `34920300638`, head `9d5664d`, conclusion `success`; its log shows
`applied 022_…`, `031_…`, `042_…`, `db-schema-lint: ok`, `db-rls-smoke: 854 isolation case(s)
passed.` and the negative control passing for every family. It ran on the branch name, after the
Q4 fix (`evidence/WP-0A-DB-00/a0-ci-measures-on-the-branch-2026-09-15.md`).

**What is left open, and whether the reasons hold.** Metering 061 and research 070: RFC-2026-022
§3 classifies their INSERT cells CARRIED (`:176`, `:179`), so a closure would refuse the policy
the RFC expects — the reason holds, and the map's (a)/(b)/(c) is the Owner's. `industry_packs`
and `industry_pack_versions`: global, worker SELECT only (P11), no restrictive policy at all (P12),
so there is no narrowing making a false claim — holds. `workspace_member_scopes`: worker SELECT
and INSERT (P11), one restrictive policy from 102 (L5), no scope narrowing — the reason holds
with L5's correction.

**A consequence to state, not a finding.** These closures refuse a future `app_maintenance` sweep
and a future `app_authz`-owned helper on the seven tables until amended — 082 said this
deliberately (`082:85-87`) and it is now true of business/page archive (§11.3) and workspace
deletion (§11.4) paths that batch 160 will need. That is the intended direction; batch 160's
author should read 082's header before reading these.

---

## 4. Stop-the-line assessment

**No finding in this document is stop-the-line under `CONTRIBUTING_AGENTS.md`** (secret
exposure, tenant leakage, duplicate external side effects, lost jobs, migration divergence,
irreversible deletion, contract mismatch). The batch adds seven RESTRICTIVE policies and three
apply-time blocks and nothing else; it widens no path (P1, P2 before and after are the same set of
privileges and admissions); it rewrites nothing merged; every measured refusal is a refusal.

M1 is a wrong statement in a premise document, not in the migration, and the conclusion it
supports is independently true against the tree. I would put M1 in front of the Owner beside the
PR, because the Owner is being asked to decide from that document.

---

## 5. What I did not check

- **The Owner's question itself** — whether Q3's shape applies to families merged before Q3.
  I checked that the batch's premise is true and its files do what they say; the decision is the
  Owner's and this file does not make it.
- **The metering and research options** beyond confirming that RFC-2026-022 §3 names their cells
  CARRIED; I did not weigh (a)/(b)/(c).
- **The seven narrowing predicates** for correctness against §7/§8.6 membership shapes — they are
  021's, 030's and 040's, merged and reviewed before this batch.
- **The Tester's and Security's chairs.** L1 says why a Tester's own replay matters; A1's view of
  the `app_authz`/`app_maintenance` consequence and of L5 is owed separately.
- **`node scripts/verify-branch-scope.mjs` on the branch** — it reads `HEAD`, the branch is not
  checked out anywhere, and ownership was enumerated by hand instead (§3).
- **The handoff plumbing** (`integrity-manifest.json` digests, `branch-identity.test.mjs`) beyond
  the two suites passing on the branch tree and CI green on its head.
- **The `covers` tag set as a whole** — only the seven new tags (L2).
- **What neither A0 nor I thought of.** A0 chose the threads; M1 came from following one of them
  to the tree, L5 from a catalog query A0 did not ask for. The rest of that category is not empty.

---

## 6. Commands run, verbatim

Worktree `/Users/bank/ThinkBizThai/.claude/worktrees/agent-a2c4f17fc142774eb`, branch
`agent/claude/WP-0A-DB-00-c0-review-pre-080` made from `main` at `4499344`. Scratch cluster on
`127.0.0.1:5522` via a helper script in the session scratchpad; the user's server on `/tmp:5432`
was not connected to, created on, or stopped.

```
git rev-parse main origin/main                                    → 4499344 (both)
git merge-base main origin/agent/claude/WP-0A-DB-00-pre-080-closures → 4499344
git merge-tree --write-tree main origin/…-pre-080-closures         → 580675d (no conflict)
git log --format='%h %cI %s' main..origin/…-pre-080-closures        → 60b69b4, 56a840d, 9d5664d (2026-09-15 09:11–09:12 +07)
git diff main...origin/…-pre-080-closures --stat                    → 12 files, +726 −31
gh pr view 144 --json … → OPEN, Draft, head 9d5664d, base main
gh run view 34920300638 → completed, success, head 9d5664d; --log grep → applied 022/031/042, lint ok, 854 passed, negative control passed
git show origin/…:<path> > <path>  (×7), then git hash-object <path> = git ls-tree blob id (×7, equal):
  022 dbcc1ac…  031 29946d5…  042 8af95ec…  isolation-cases 91c7091…  identity test 09251cc…  contract test 3b5f2e1…  snapshot 3d5d482…
wc -c 022/031/042 → 11490 / 9626 / 10325 bytes; 082/083/092/101 → 17032 / 8289 / 9329 / 10788
awk length max → 221 / 216 / 274 (082: 208)
grep -n -E 'create policy … on app.(seven)' db/foundation/migrations/*.sql, TO clauses → all `to authenticated`
grep -n -E 'grant … on app.(seven)' … | grep -v 'to authenticated' → 020:452-455, 030:485, 040:529-530 (app_worker)
node (buildCases((s)=>s)) main → 847 ids, unique; branch → 854 ids, unique; added = the seven; none matches a ci.yml control pattern

node --test tests/db/identity/identity-isolation.test.mjs   main → 285/285   branch tree → 285/285
node --test test-kits/db/foundation-contract.test.mjs        main → 60/60     branch tree → 60/60

initdb (C, UTF8) → pg_ctl start -p 5522 → create database thinkbizthai_test → supabase-shim.sql   (×4 fresh clusters)
DB_TEST_URL=postgresql://postgres@127.0.0.1:5522/thinkbizthai_test LC_ALL=C TZ=UTC PGTZ=UTC node scripts/db/run.mjs …
  main:            migrate-clean ok (36 applied) · schema-lint ok · rls-smoke: 847 isolation case(s) passed.
  branch files:    migrate-clean ok (39 applied) · schema-lint ok · rls-smoke: 854 isolation case(s) passed.
  files removed:   migrate-clean ok (36 applied) · rls-smoke: FAILED — 7 of 854 case(s)  (the seven new ids; 7 failed-case lines)
  C0-M6 live:      022 `count_of <> 5` → migrate-clean FAILED at 022 after 10 applied, P0001
psql -f c0-pre080-probes.sql (branch state, after rls-smoke) → P0–P10 as recorded in §3
psql -f c0-pre080-privs.sql → P11–P13 as recorded in §3
node c0-pre080-mutations.mjs / c0-pre080-mutations2.mjs (extracted tree via git archive | tar; node_modules symlinked) → table in §3; every file restored and hash-checked
pg_ctl stop -m fast; rm -rf pg-scratch; git checkout -- <4 files>; rm <3 migrations>; git status → only this file

npm run verify   (this branch, with this file in the tree)   → clean: exit 0 — tests 643, pass 643, fail 0, skipped 0, todo 0
```

Not run, and why: `npm run check:scope` (takes no arguments, exits 0 — not evidence);
`npm run refresh:handoff` (A0's artifact); anything against `/tmp:5432`.

---

## 7. Verdict

**From the Reviewer's chair, the three files do what they say, and the premise they rest on is
true against the tree — with one correction owed (M1).** Seven RESTRICTIVE, `FOR ALL`, `TO PUBLIC`
closures with 082's predicate, held to 082's shape by the static rule and asserted by the catalog
at apply time; no `S` cell in RFC-2026-022 §3 on any of the three families; every permissive
policy on the seven tables admits `authenticated` alone; the worker's grants — larger than the
map says — are admitted by no policy today and refused by the closure tomorrow, on read and on
write, measured. Nothing merged is rewritten; nothing is widened; no case moved but the seven
that were added.

What this review **does not** sign: the Owner's decision (whether Q3's shape reaches families
merged before Q3 — that is the question PR #144 is a Draft for), the Tester's replay (L1 says why
it is worth having), and Security's view of the `app_maintenance`/`app_authz` consequence and of
L5. It asks A0 for one thing before or with the merge: correct the S8 map's grants column (M1),
so the document the Owner decides from says what the tree says.

This file is the Reviewer's and is one of the four signatures RFC-2026-002 names, in the sense
the Owner's Q1 disposition allows; it is not the Tester's, not Security's, not the Integration
Owner's, and it approves nothing.
