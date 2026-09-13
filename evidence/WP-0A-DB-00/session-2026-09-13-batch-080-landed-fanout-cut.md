# Session handoff — 2026-09-12 → 13: batch 080 landed, a six-agent fan-out launched and cut

Author run: `/claude/a0_atlas` (Anthropic), the run the manifest names as Author. Package: `WP-0A-DB-00`. Written at the Product Owner's
instruction to end the session here and record where it ends. This file is a STATE RECORD and
approves nothing; it is the "read this first" for whoever opens the repository next, because
`OVERNIGHT-SUMMARY.md` describes a state that ended at PR #13 and a notice now points here.

## 1. Where `main` is

`main` = `49830ad` = merge of [PR #112](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/112),
**batch 080 (`content.core`)**. Working tree clean.

| Measure | Value | Where it comes from |
|---|---|---|
| `npm run verify` on `main` | **clean: exit 0 — tests 586, pass 586, fail 0** | run locally after the merge |
| Isolation cases | **629** (550 → 629) | `db-rls-smoke: 629 isolation case(s) passed` in CI run 34678716740 |
| Static isolation suite | **232** tests (218 → 232) | `tests/db/identity/identity-isolation.test.mjs` |
| Migrations on disk | 000–004, 010, 011, 020, 021, 030, 040, 041, 050, 051, 060, 061, 070, **080**, 110, 130, 131, 132, 140 | `db/foundation/migrations/` |
| `WP-0A-DB-00.status` | `in_progress` | manifest |
| `open_blockers` | **130** (124 + 6 from batch 080) | manifest |
| Gate | G0 — Specification Baseline Complete / External Verification Pending | unchanged |

**HOW PR #112 WAS MERGED, STATED PLAINLY.** RFC-2026-002 requires, before the Product Owner merges,
a green required CI run **and** linked Author, independent Reviewer, independent Tester,
Security/Privacy and Integration Owner evidence. #112 had CI green (run 34678716740, head `3cd1617`)
and the Author's handoff. **The other four signatures were absent**, as they have been on every
increment in this package's history, and the Product Owner directed the merge with that stated to
them in the same message. No `product-owner-disposition-*.md` was written for it; this paragraph is
the only record, and the next session should decide whether one is owed.

## 2. What this session did

Batch 080 was found on `main` as an UNTRACKED draft — `080_content.sql` plus one line in
`catalog-snapshot.json` — with a red suite and two false sentences in its own header ("the migration
asserts the count"; "the second half asserted below" — it asserted nothing). It was finished as one
branch, three commits (`2cd1450`, `2941e28`, `3cd1617`):

- **Migration**: apply-time `do $$` block (ENABLE/FORCE; the three immutable tables hold no write
  grant AND no write policy, asserted both ways against the live catalog; `status` /
  `current_version_id` / identity and scope columns outside every UPDATE grant; no DELETE for any
  role; `app_worker`, `anon`, `app_authz` hold nothing; no policy names a non-`authenticated` role;
  five RESTRICTIVE narrowings inspected on BOTH halves, each child resolving through its parent;
  ownership rule). `content_variants_logical_key` changed to **`unique nulls not distinct`** — under
  the default the "one untyped variant per platform" rule held for nobody. WITH CHECK halves added to
  the three child narrowings.
- **Decision recorded**: `app_worker` is granted NOTHING on all five tables (070 granted verbs). The
  writer content needs is a SECURITY DEFINER function owned by `app_command` (RFC-2026-017 §3); a
  worker with grants would be a second path (the shape RFC-2026-018 was superseded for). Consequence:
  every service case is a privilege refusal, none carries RFC-2026-017 §7, none is in the CI
  negative-control basis, and **nothing in this repository can write a content version, variant or
  quality review** until a command function exists.
- **Fixture** (`080-content-fixture.sql`, 11 catalog symbols — three for rows that already have a
  natural key, argued in the catalog and README), **79 isolation cases**, **14 static tests**, five
  CI negative-control entries, floors raised (218→232 tests, 1607→1686 assertions), README, manifest
  (branch slot, `amends_without_owning`, 6 new blockers), handoff, evidence.
- **`SMOKE_COVERAGE[3]` flipped `knowledge-half` → `true`** (§12.6/3: approver cannot edit
  content/knowledge — 040 paid knowledge, 080 pays content, with the approver READ beside the three
  refusals). The eight earlier-batch assertions pinning the old value were rewritten in the same
  change, none deleted.
- **Probes**: 17 reversal probes, 15 noticed on first run, **2 not** — an inline FK on
  `generation_run_id` the rule's regex could not see, and an apply-time assertion narrowed to one of
  its three tables. Both rules changed; the second is covered by a COUNT, weaker than the defect
  deserves, labelled as such in `evidence/WP-0A-DB-00/a3-batch-080-probes-2026-09-12.md`.
- **CI proved** (run 34678457021 then 34678716740): `db-migrate-clean` ok in 1345ms — first time the
  SQL met Postgres 17; 629 cases passed; the five new control entries bit (7 / 12 / 4 / 2 / 3 cases
  noticed). Evidence and handoff sentences that had said "no case has met a database" were corrected
  in place with the run cited (`3cd1617`).

The six blockers batch 080 added, one line each (full text in the manifest):
1. Three columns §4.6 names and does not enumerate carry no CHECK (`content_ideas.status`,
   `content_items.approval_state`, `content_variants.variant_type`).
2. `content_ideas.research_suggestion_id` references `app.research_suggestions` on `id` ALONE — a
   dangling cross-tenant citation is possible; the composite unique is owed to batch 070's owner.
3. The `findings` CHECK holds a shape and not stability, language, or whitespace-only refusal.
4. No writer exists for the three immutable tables (§8.2 row 3 + no command function).
5. §8.2 "create/edit/version" `Y` is half implemented; the status half needs a command.
6. `app.generation_runs` still assigned to nobody; two columns reference it unenforced.

## 3. The fan-out that was launched and cut

After the merge the Product Owner said "กระจาย subagent ลุยเลย". Six agent runs were launched in
parallel, each in its own worktree at `49830ad`, each to open its own Draft PR:

| Run id | Task | Intended branch |
|---|---|---|
| `/claude/a3_content` | batch **081** `content_targets` (deferred Social FK; 111 finalises) | `agent/claude/WP-0A-DB-00-batch-081` |
| `/claude/a5_loom` | batch **090** approval — policies (versioned) / requests (§4.7 status vocabulary) / events (append-only, `N` for all incl. service) | `…-batch-090` |
| `/claude/a4_asset` | batch **100** asset — versions immutable with locator+digest column allowlist (070's snapshot shape), rights, links; the `S` "hard purge" cell classified in `service-policy-map.json`, no policy | `…-batch-100` |
| `/claude/c0_contract_reviewer` | independent **Reviewer** of batch 080 | `…-c0-review-080` |
| `/claude/q0_sentinel` | independent **Tester** of batch 080 (hand-simulate all 79 cases; ≥8 new probes) | `…-q0-test-080` |
| `/claude/a1_bastion` | **Security/Privacy** review of batch 080 — pressed hardest on whether "a SECURITY DEFINER function owned by `app_command` is exempt by ownership" is true under FORCE RLS (it may over-state the mechanism: FORCE binds the table owner too, and `app_command` is not the table owner) | `…-a1-security-080` |

**Then the Product Owner ended the session.** All six were stopped. Measured at the moment of the
cut: **every worktree had 0 uncommitted paths and 0 commits ahead of `49830ad`** — the agents were
still in their mandated reading phase. **Nothing was lost and nothing is salvageable**; there is no
partial batch anywhere on disk or on the remote. The six worktrees under `.claude/worktrees/agent-*`
and their `worktree-agent-*` branch refs are empty and can be removed
(`git worktree prune` after deleting the directories, then `git branch -D worktree-agent-…`).

Why those six and not others (so the plan survives the session):
- 081, 090 and 100 are the only unwritten batches whose §6 dependencies are all on `main`
  (080 ✓; 020/050/061 ✓). 091 needs 090; 111 needs 081; 120 needs 091, 100, 111; 121 needs 120;
  141/150/160/170/180 need everything. Three independent leaves → three parallel authors.
- The three role runs close the gap RFC-2026-002 names and that §1 above records; the repository's
  own precedent for a spawned same-vendor reviewer is `evidence/WP-0A-DB-00/c0-review-2026-09-06-night.md`
  §0, whose disclosure each was told to reproduce.
- Integration must be SEQUENTIAL: `ownership.branch` is a single slot pinned in
  `test-kits/branch-identity.test.mjs`, and the three batches touch the same shared files
  (`isolation-cases.mjs`, `identity-isolation.test.mjs`, `catalog-snapshot.json`,
  `fixture-catalog.json`, `ci.yml`, `test-suite-contract.mjs`, the manifest). Merge one, rebase the
  next, repoint, regenerate `integrity-manifest.json` and `evidence/VERIFICATION.md` rather than
  hand-merging them.

The batch-author checklist each was given is the file list in §2 above plus: no invented
vocabulary/retention/`P` capability; case ids must not contain another family's CI control-pattern
word (`business`, `page`, `research`, `content-item`, …); `NOT_ON_THE_INSTANCE` and the snapshot
declaration stay a TAIL inserted in sort order; ≥12 reversal probes recorded; CI is the first
Postgres; correct evidence in place when CI makes a sentence false.

## 4. What remains (unchanged by this session except where marked)

- **Independent role evidence on batch 080** — still absent (the three role runs above never
  started work). Owed before anything about 080 is called `review_approved`.
- **Batches not written**: 081, 090, 100 (ready now), then 091, 111, 120, 121, then 141, 150, 160,
  170, 180.
- **Decisions only people can make**: an owner for `app.generation_runs`, channel binding and
  `app.workspace_entitlements` in §6's registry (A0 + RFC); RFC-2026-010's remaining promotions
  (`CTR-SEC-001` → A1; `CTR-AUD/OBS/USG-001` → A6; `CTR-NTF-001` → A5); DATA-DEC-03 (service path,
  due before G1); DATA-DEC-07 (research snapshot retention); `db/foundation/lint/read-allowlist.json`
  required by RFC-2026-021 §8.1 and absent; RFC-2026-020/-022 "NOT IN EFFECT" conditions.
- **Housekeeping**: 10 merged local `agent/claude/*` branches (0 ahead) plus the six empty
  `worktree-agent-*` refs; `con007-prev`, `con008-old/prev/prev2` are pre-rebase remnants (25–41
  commits ahead of `main`, PRs long merged) — confirm before deleting.
- **`docs/handoffs/db-00/**` in `WP-0A-DB-00.writable_paths` is DEAD.** This record was first written
  there and `scripts/validate-work-package-ownership.mjs` refused it (exit 69: output matches
  `read_only_paths`), because `docs/**` in `read_only_paths` takes precedence over the narrower
  writable entry. The record lives under `evidence/WP-0A-DB-00/` instead; either the validator's
  precedence or the manifest's dead entry is owed a fix (A0).
- **`OVERNIGHT-SUMMARY.md`** is superseded by this file for state; its account of the twenty
  verification runs and the guards they defeated remains the best explanation of WHY the guards look
  the way they do, and is not rewritten here.
