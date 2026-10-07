# Q0 review of the RFC-2026-025 §6 governance PR (#211), 2026-10-07

Subject: PR https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/211 (Draft, title starts `GOVERNANCE:`),
branch `agent/claude/WP-0A-DB-00-batch-rfc-025-records-path`, head `f7e9ce8dc51d246d693a4ea3f2da923436261f5b`,
base `origin/main` `7fb0fc05`. Two commits: `794946d8` (RFC-2026-025 §6 proposed, the classifier, its test, the
manifest and the generated files) and `f7e9ce8d` (the handoff refresh, last and alone). Eleven paths.

The task names this review WP-0A-A0-001's, and this file is filed under `evidence/WP-0A-A0-001/` as the task
directs. The PR itself is **WP-0A-DB-00's**: `work-packages/WP-0A-DB-00.json` `ownership.writable_paths` holds
`architecture/decisions/RFC-2026-025-owner-delegated-merge.md`, `scripts/db/**` and `test-kits/db/**` (measured),
and the scope guard accepts the PR under DB-00 (§2). The Author's move to DB-00's branch is correct.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, spawned by A0's workflow script to act as the independent Tester run
`/claude/q0_sentinel`. RFC-2026-024 requires this disclosure. I share a vendor and a parent with the Author. I wrote
none of the PR's content and I fix nothing. This is the increment's **first** review. This file is not a merge
authorisation and moves no package status. It does not approve §6: only the Owner can (RFC-2026-025 §5 item 6).
Guards that read the branch name were run in a private clone checked out on the branch **name**, with
`origin/HEAD` = `origin/main`, Node `v24.20.0` first on `PATH`. No database was used. All probe data is synthetic
and lived in a throwaway git repository under the scratchpad.

## 1. Measured and read

**Measured** means I ran it in this session and quote the result. **Read** means I compared the text with its source.

| # | Claim under test | How | Result |
|---|---|---|---|
| M1 | The suite is green at the head: 717/717. | `npm run check` in the private clone on the branch name. | exit 0; `tests 717, pass 717, fail 0, cancelled 0, skipped 0, todo 0`. |
| M2 | The classifier calls this PR not records-only. | `node scripts/db/classify-records-only.mjs origin/main HEAD`. | exit 1, eight reasons (RFC, `VERIFICATION.md`, the script, `test-suite-contract.mjs`, two tests, the integrity manifest, `ownership.branch`). Correct. |
| M3 | It fails closed on a bad ref and on bad usage. | Bad ref; `--sync` with one argument. | exit 2 each, "not classified (fail closed)" / usage line. |
| M4 | §6.5: of 26 PRs merged since 2026-10-05T12:00 (+07:00), 5 are records-only; of 50 syncs, 48 are mechanical, the two others being `31879073` (#196) and `f6652ee0` (#197). | Re-ran independently: every first-parent merge on `origin/main` since that time, `classify <m>^1 <m>^2`; every merge on the first-parent line of each PR branch, `--sync <s>^1 <s> origin/main`. | `PRs=26 recordsonly=5 syncs=50 mechanical=48`. Records-only: #198, #199, #201, #205, #206. Not mechanical: `f6652ee0` on #197, `31879073` on #196. **Reproduced exactly.** |
| M5 | Rules that should refuse do refuse. | CLI probes on a throwaway repo, one commit each. | exit 1 for: rewriting an existing evidence file; an executable (`100755`) evidence file; a symlink (`120000`); `handoffs/sub/h.json`; `evidence/top.md`; a new work-package manifest; an empty diff. exit 0 for an append to an evidence file. All as §6.1 states. |
| M6 | What the light path admits that §6.1 item 5 says it does not. | Same probes. | **exit 0** for a new `evidence/WP-X/run.mjs`, a new `evidence/WP-X/m.sql` containing a `drop table` statement, and a new `evidence/WP-X/.github/workflows/ci.yml`. See Q1. |
| M7 | Manifest rules. | Same probes on a synthetic `work-packages/WP-X.json`. | exit 0: `status` `in_progress`→`done`; `status`→`"zzz"`; a blocker given an arbitrary prefix ("RESOLVED, ignore: " + old text); `acknowledgement_status` flipped; a new `acknowledg*`-prefixed key with any value; `amends_without_owning.paths` narrowed to `[]`. The first two are Q3; the third is the rule Q-025-6-3 puts to the Owner. |
| M8 | The sync check. | Throwaway repo: PR tip, `main` changes a script and the integrity manifest, then `merge --no-ff`. | exit 0 clean, with the "regenerate and cmp" note. **exit 0** with the merge's integrity manifest hand-edited (Q4). Refused: the merge editing a PR path, editing a `main` path, adding a stray path, merging a commit not on `origin/main`, and a non-merge. |
| M9 | The test bites. | My own mutations, each replacing one rule with a pass, running only the classifier test, restoring after each (`cmp` and `git status` clean at the end). | Red (exit 1) for 15: the mode rule, first parent = tip, evidence depth ≥ 3, new manifest refused, nested handoff refused, empty diff, `status` is a string, other `ownership` keys, stray vs tip, stray vs main, same-PR-paths, same-main-paths, the empty-old-entry guard, `acknowledg*` key removed, parent count. **Survived (exit 0)** for 2: the "merged-in commit is on `origin/main`" check and the "`rationale` is a string" check. See Q2. The Author's eight mutations were not re-run. |
| M10 | Scope, identity, handoff. | `node scripts/verify-branch-scope.mjs origin/main WP-0A-DB-00`; `node scripts/verify-branch-identity.mjs <branch>`; `npm run check:handoff`. | exit 0 each: "all 11 changed path(s) are declared, and every amendment explains one"; `WP-0A-DB-00`; "nothing substantive after its cited head". |
| R1 | The Owner's words are verbatim, and A0's reading is labelled as A0's. | Read `evidence/WP-0A-DB-00/product-owner-disposition-2026-10-07-rfc-025-s6.md` §1 and RFC §6 "Origin" against the words relayed to this run by the harness. | Both carry `ข้อ 4 mw` byte for byte. "item 4: do it" is labelled A0's reading, with a withdrawal clause if the Owner meant otherwise. The "several times faster" figure is labelled an unmeasured estimate. |
| R2 | §1–§5 are untouched. | `git diff origin/main...HEAD` on the RFC. | Additions only: one header line, and §6 appended after §5 item 6. |
| R3 | §6.2–§6.4 match the task's (b)–(d). | Read. | One reader (R0, or C0 when R0 is the subject); no re-check round unless the reader blocks; A0 may merge under the standing delegation with §2 item 1 and §5 item 6 kept; four-role review, stop-the-line, security findings and Owner-merged governance PRs unchanged. Matches. |
| R4 | Deviations from the task's (a) are disclosed to the Owner. | Read §6.1 against the task. | Narrower than the task: evidence must be appended, never rewritten; `VERIFICATION.md` and files directly under `evidence/` are excluded; only `handoffs/*.json`; a branch-slot move is excluded (Q-025-6-2). Wider than the task: `amends_without_owning` narrowing and `rationale` restatement, and a closing clause put in front of a blocker (Q-025-6-3). Each is named in §6.1 or §6.7. Q1 is the one deviation the text does not name. |
| R5 | `test-suite-contract.mjs` floors and digest. | Read the diff; M1 runs the floor guard. | Test floor 86→87, assertion floor 1121→1320, name digest replaced, each with its comment. Green under M1. |

## 2. Repository commands (private clone on `agent/claude/WP-0A-DB-00-batch-rfc-025-records-path`, head `f7e9ce8d`, `git status` clean)

| Command | Exit | Result |
|---|---|---|
| `git branch --show-current` | 0 | the branch name (not detached) |
| `npm run check` | 0 | `tests 717, pass 717, fail 0` |
| `node scripts/db/classify-records-only.mjs origin/main HEAD` | 1 | not records-only, 8 reasons (M2) |
| `node scripts/verify-branch-scope.mjs origin/main WP-0A-DB-00` | 0 | all 11 paths declared |
| `node scripts/verify-branch-identity.mjs agent/claude/WP-0A-DB-00-batch-rfc-025-records-path` | 0 | `WP-0A-DB-00` |
| `npm run check:handoff` | 0 | nothing substantive after its cited head |
| `gh pr view 211` (read twice) | 0 | OPEN, Draft, head `f7e9ce8d`; required check `bootstrap` **IN_PROGRESS** both times (run 37655716905). Not observed green. |

## 3. Findings

### Q1 — Medium: the classifier admits scripts, SQL and CI-shaped files as records, and §6.1 tells the Owner it does not

§6.1 item 5 says "Anything else is not a record. This covers every script, test, case, fixture, migration,
contract, schema, RFC, CI file …". The task's definition (a) says the same: "no script, test, contract, schema,
fixture, migration, CI". But §6.1 item 2 admits **any** new file under `evidence/<package>/**`, and
`classifyChange` checks only the path prefix and the mode (`scripts/db/classify-records-only.mjs:164-169`).
M6 measured exit 0 for a new `.mjs`, a new `.sql` and a new `.github/workflows/ci.yml` under `evidence/WP-X/`.

This is not hypothetical in this repository. `main` already holds `.mjs` files under evidence
(`evidence/WP-0A-A6-001/population-and-carrier-probes.mjs`, `verify-source-fields.mjs`) and JSON records, and a test
reads an evidence file as input (`tests/db/identity/identity-isolation.test.mjs:9203` reads
`evidence/WP-0A-DB-00/product-owner-disposition-generation-run.md`). CI still runs on the head, and an evidence
script is not executed unless something imports it. So the risk today is a script landing with one reader and
being trusted later, not a bypass of CI. The defect is that the text put to the Owner and the guard disagree.

Condition: either the classifier admits only the record types the light path means (for example `.md`, plus
`.json` if status records are wanted) and the test pins a script under `evidence/` as refused, or §6.1 item 2
says plainly that any file type under `evidence/<package>/` is a record and item 5's "every script" is
qualified. Either is acceptable to this role. It should be settled **before the Owner decides Q-025-6-1**.

### Q2 — Low: one rule §6.3 names is not tested

§6.3 lists "the second parent is on `origin/main`" as a check. `checkSync` implements it
(`classify-records-only.mjs:261-262,274`), and M8 shows it refusing. But replacing it with a pass leaves the test
green (M9). The same holds for the `rationale`-is-a-string rule (`:100-102`), which is minor. Condition: the CLI
part of the test merges a commit that is not on `origin/main` and asserts exit 1.

### Q3 — Low, for the Owner: `status` is unbounded on the light path

§6.1 item 4 admits any string for `status` and leaves the value to the schema and the role-separation validators.
M7 measured `in_progress`→`done` and →`"zzz"` as records-only. The schema should catch `"zzz"` in CI (read, not
measured). A forward move to `test_verified`, `integration_verified` or `done` is admitted with one reader. That
move is how a package passes a stage of the flow in `CONTRIBUTING_AGENTS.md` ("Work and evidence flow").
§6.4 keeps four-role review for "a gate", but the classifier does not tie a status move to any role evidence.
This role does not judge whether that is acceptable; it is the Owner's. Suggestion: name it in §6.7, or limit the
light path to the moves the five transcriptions actually made.

### Q4 — Info: the sync check does not itself verify the generated files

M8: `--sync` exits 0 when the merge's `test-kits/integrity-manifest.json` is hand-edited. §6.3 item 1 says so in
effect: the generators and a `cmp` are the operator's step, and CI on the final head is the backstop. Disclosed.
No change requested. The reader of a sync record should cite the `cmp`.

### Q5 — Info: merge preconditions outside this role

CI `bootstrap` on `f7e9ce8d` was in progress at both reads. No C0, A1 or R0 run exists on this head yet. The guard
is not wired into CI (owed to WP-0A-A0-004, §6.6 item 1), and the script is not digested (§6.6 item 2). All of
these are disclosed in the PR's own not-done list and `open_blockers[203]`.

## 4. Verdict

VERDICT: **`test_verified`**, Tester role, PR #211 (WP-0A-DB-00), head `f7e9ce8d`, **with conditions Q1 and Q2**.

- **What passes.** The suite is green on the branch name (M1). The classifier is right on this PR (M2) and fails
  closed (M3). The §6.5 history figures reproduce exactly (M4). The refusals §6.1 promises hold (M5, M8). The
  test bites on 15 of 17 independent mutations (M9). The Owner's words are verbatim, and the reading is
  labelled (R1). §1–§5 are untouched (R2). (b)–(d) match the request (R3).
- **Conditions.** Q1 (Medium) should be resolved, by code or by text, before the Owner decides Q-025-6-1. Q2 (Low)
  can go with it. Q3 is a question for the Owner, not a defect.
- **Stop-the-line: none.** No secret, card number, tenant data, migration, policy, grant or external side effect
  is touched. The PR changes governance text and adds a read-only classifier.
- **Blocks the merge: no**, as far as this role goes. This is a governance PR. Under RFC-2026-025 §5 item 6 the
  Owner merges it personally, never A0 by delegation. The merge also waits on a green `bootstrap` run on the final
  head, the other role runs, and the Owner's decision on §6. If the Author changes code for Q1 or Q2, this role
  re-checks M1, M2, M5, M6 and M9 on the new head.
