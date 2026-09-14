# Session handoff — 2026-09-13/14: the fan-out was relaunched, all six finished, nothing merged

Author run: `/claude/a0_atlas` (Anthropic), the run the manifest names as Author. Package: `WP-0A-DB-00`.
Written at the Product Owner's instruction to end the session here and record where it ends. This file
is a STATE RECORD and approves nothing; it is the "read this first" for whoever opens the repository
next. It supersedes
[`session-2026-09-13-batch-080-landed-fanout-cut.md`](session-2026-09-13-batch-080-landed-fanout-cut.md)
for STATE — that file's §2 (what batch 080 is) and §3's *reasoning* about which batches were ready
remain the best account of those things and are not repeated here. `OVERNIGHT-SUMMARY.md` remains
stale for state and was already superseded.

## 1. Where `main` is — unchanged

`main` = `c5eb1b9` = merge of [PR #113](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/113).
**`main` did not move at any point during this session. Nothing was merged. Nothing was force-pushed.
No agent touched `main`.** Measured at the close: `origin/main` and local `main` both `c5eb1b9`,
working tree clean.

| Measure | Value | Where it comes from |
|---|---|---|
| `npm run verify` on `main` | **clean: exit 0 — tests 586, pass 586, fail 0** | run locally at the close of this session |
| Isolation cases on `main` | **629** | CI run 34678716740; **not** re-measured locally — this machine has no PostgreSQL |
| `WP-0A-DB-00.status` | `in_progress` | manifest |
| `open_blockers` on `main` | **130** | manifest |
| Gate | G0 — Specification Baseline Complete / External Verification Pending | unchanged |

## 2. The six runs, and what each produced

The fan-out §3 of the previous record planned was relaunched, one worktree each at `c5eb1b9`, each
opening its own **Draft** PR. All six finished. **All six PRs are open, Draft, and unmerged.**

| Run | Task | PR | head | CI run | CI | `npm run verify` | blockers |
|---|---|---|---|---|---|---|---|
| `/claude/a3_content` | batch **081** `content_targets` | [#117](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/117) | `822501c` | 34752998819 | success | `clean: exit 0 — tests 600, pass 600, fail 0` | 130 → **137** |
| `/claude/a5_loom` | batch **090** approval | [#119](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/119) | `6c113ae` | 34754553767 | success | `clean: exit 0 — tests 603, pass 603, fail 0` | 130 → **139** |
| `/claude/a4_asset` | batch **100** asset | [#118](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/118) | `131de6f` | 34755380758 | success | `clean: exit 0 — tests 604, pass 604, fail 0` | 130 → **142** |
| `/claude/c0_contract_reviewer` | **Reviewer** of 080 | [#115](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/115) | `3210ee3` | 34753386588 | success | **`NOT clean: 584/586`, deliberately** | 130 unchanged |
| `/claude/q0_sentinel` | **Tester** of 080 | [#116](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/116) | `f4579c0` | 34753121236 | success | `clean 586/586` at `317f555`; `584/586` at head | 130 unchanged |
| `/claude/a1_bastion` | **Security/Privacy** of 080 | [#114](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/114) | `78774e2` | 34752341453 | success | **`NOT clean: 584/586`, deliberately** | 130 unchanged |

Isolation cases, each measured **in CI against PostgreSQL 17** and each counted from the same `629`
base, because the three branches are independent of one another: **081 → 665**, **090 → 712**,
**100 → 705**. These three numbers do not add; whoever integrates recomputes them.

The three role runs left `open_blockers` at 130 and wrote only their own evidence file plus the
branch-identity plumbing. That is the instruction working: a reviewer that repairs what it finds is
not a reviewer. Their findings live in their evidence files and in no status field.

### The batch authors' own honest numbers

- **081** — 36 cases, 14 static rules, one CI control entry (`app.content_targets (081): 14 case(s)
  noticed`). Probes **31, 30 noticed, 1 missed**. The miss is worth reading: the rule matched the
  `raise exception` text beside the query, so **the rule was satisfied by the error message of the
  assertion it was checking**. Rewritten to read the predicate itself, which is STRONGER than the
  original — deliberately unlike batch 080's COUNT — and the rewrite immediately caught a probe the
  original could not have caught even working.
- **090** — 83 cases, controls `approval_policies: 14 / approval_requests: 17 / approval_events: 3`.
  Probes **19, 17 noticed, 2 missed**; both misses were one gap — no static rule read the
  **permissive** policies' predicates at all, so widening the trail's SELECT to `using (true)` and
  deleting the `created_by = (select auth.uid())` guard from the policy INSERT both left the suite
  green. One new rule now reads every predicate of all eight permissive policies, and its own count
  assertion caught the author's arithmetic (`8 !== 7`) on first run.
- **100** — 76 cases, four control entries (`assets: 15 / asset_versions: 7 / asset_rights: 10 /
  content_asset_links: 5`). Probes **29 valid, 24 noticed, 5 missed**; two further probes discarded as
  testing nothing. §8.2's `Asset hard purge` `S` cell is classified in `service-policy-map.json` in
  **both** shapes — CARRIED on `asset_versions`, DISCOVERED on `assets`, both `update` — with **no
  service policy**, because RFC-2026-022 is NOT IN EFFECT.

## 3. What the three role runs found about batch 080, which is already on `main`

Each finding below was re-verified by the coordinating session against the tree, and the file:line
references are the coordinator's own reading, not a relay.

### 3.1 STOP-THE-LINE — the scope narrowings do not bound the writer the design contemplates

`/claude/a1_bastion`'s **S8**. All five RESTRICTIVE scope narrowings in `080_content.sql` are written
`for all to authenticated` (lines 590/591, 606/607, 635/636, 665/666, 703/704). A policy applies only
to the roles its `TO` clause names, and `app_command` is not `authenticated` — `001_service_roles.sql`
creates it `noinherit` and RFC-2026-019 §5 asserts that `authenticator` is a member of `anon`,
`authenticated` and `service_role` **and of no service role**. So when the promised SECURITY DEFINER
writer arrives, none of the five narrowings will constrain it.

This is not a missing `WITH CHECK`: both halves are present on all five and textually identical. And
`080_content.sql:621-629` states in its own words that both halves are written against exactly the
case they do not cover — "a command path taking a shortcut, a `P` cell somebody decides to
implement". **A control this repository states it has, in a migration that must never be rewritten,
that does not exist.**

A1 declined the stop-the-line label on S1 alone and took it on S8, distinguishing the two: S1 errs
conservative, S8 does not. It also named the trap in the forward fix — **it becomes worse, not
better, if the repair grants `app_command` `BYPASSRLS`, drops FORCE, or makes `app_command` a table
owner.** Those are the three cheap repairs the false sentence in §3.2 makes look principled, and
RFC-2026-017 §4 names that temptation.

### 3.2 "exempt by ownership" is false, in six locations

Reached independently by `/claude/c0_contract_reviewer` (reading RFC-2026-017 §3 against the
migration) and by `/claude/a1_bastion` (reading the role's own creation). Two runs arriving at one
finding by different routes is the strongest corroboration this same-vendor arrangement can produce,
and both said so rather than presenting it as consensus.

- `db/foundation/migrations/001_service_roles.sql:41-42` creates `app_command` `nobypassrls` with the
  comment: **"NOBYPASSRLS, and never the table owner, so the policies written for it actually apply
  to it."** The role was created so that policies **would** bind it.
- `RFC-2026-017-service-path-identity.md` §3: `app_command` is "deliberately **not** the table owner",
  and such a function on a forced table **"is subject to RLS and needs policies that name it — which
  is the intended behaviour."**
- `080_content.sql:897` says the function "is exempt from these policies by being the owner rather
  than by holding a privilege (RFC-2026-017 §3)"; `:114` says §3 "arranges" that exemption. The same
  file at `:770` says FORCE exists precisely because otherwise the owner is exempt. **The file
  contradicts itself.**
- The claim is repeated in `tests/db/identity/identity-isolation.test.mjs:8993-8994`, in
  `scripts/db/run.mjs:626-628` (the comment above the lint that enforces the rule: "a SECURITY
  DEFINER function owned by the table owner is exempt from the policies on a forced table" — the rule
  is sound, its stated reason is not, and `:622` six lines above states the correct version, "ENABLE
  alone leaves the table owner exempt"), and, the location that matters most because it is what the
  next agent reads, in the manifest's own blocker at `work-packages/WP-0A-DB-00.json:330`.

**What it costs.** The batch's central deferral is priced as "waiting for a command function". The
true price is a command function **plus** a forward migration granting and policing `app_command` —
and `080_content.sql:752-808` puts `app_command` in `every_role` and raises at apply time if it holds
INSERT on `content_versions`. The migration forbids at apply time the privilege its own stated design
requires. The writer path is **locked**, not merely unwritten, and CI is green on it.

### 3.3 The handoff guard cannot fire in CI

`/claude/q0_sentinel`'s **F10**, `/claude/c0_contract_reviewer`'s **M5**, `/claude/a1_bastion`'s
**S10** — three runs, three routes, one fact. `.github/workflows/ci.yml:36` checks out with no `ref:`,
so on a pull request `actions/checkout` leaves a **detached HEAD**;
`test-kits/handoff-conformance.test.mjs:233` reads `git rev-parse --abbrev-ref HEAD`, gets `HEAD`,
finds no package claiming it, and **returns early — which is reported as a pass.**

Reproduced end to end at `ffd9cc3`: CI run `34753189118` **success, every step including the database
ones**, while `npm run verify` on that identical commit reads **`NOT clean: 584/586`**. The
coordinating session fell into the same trap while checking this, measuring a branch at a detached
HEAD and reading a false green — **measure on the branch name, never detached.**

This matters beyond the guard: RFC-2026-002 makes "a green required CI run" one of the things the
Product Owner merges on. A guard that is red on the tree and green in CI is a hole in that evidence
chain, and it is green for the branch whose handoff genuinely does not describe it.

### 3.4 A role run cannot keep a green tree, and why that is friction rather than an excuse

C0's **M6**, and the story is worth keeping because C0 was pushed twice and was right both times.
`driftBetween` (`scripts/refresh-author-handoff.mjs:55`) ranges over `cited..HEAD^`, and
`WRITTEN_AFTERWARDS` (`:36`) exempts `^handoffs/`, `^evidence/`, `OVERNIGHT-SUMMARY.md` and
`test-kits/integrity-manifest.json` — but **not** `test-kits/branch-identity.test.mjs` and **not**
`work-packages/**`, which are exactly the two files a role run is required to edit to repoint
`ownership.branch`.

**The rule is position, not count: the tree is green only while the plumbing is the LAST commit.**
A1 was green with the plumbing in commit 1 of 2 and red at 3; C0 was green with it in commit 5 of 5
and red at 8. Once the plumbing falls into the `..HEAD^` range no later commit removes it; the only
repair is a force-push, which is forbidden. **The guard prints, as its own remedy,
`Run npm run refresh:handoff` — the rewrite of another run's artifact.** A1 and C0 both took the red
rather than do that; their `584/586` is a choice, not a defect, and it is the same two tests
(`the handoff for this branch describes this branch`, and the handoff ratchet).

C0 also declined, on its own judgement and against the coordinator's instruction, to attribute the
four absent role signatures to this mechanism: **two role runs in this fan-out delivered their
evidence and neither was prevented, so using a tooling defect to excuse a governance gap would be
wrong. The signatures are owed.** That reasoning is adopted here.

### 3.5 Batch 080 adds 75 isolation cases, not 79

`/claude/q0_sentinel`. The base was **554**, not 550: CI run `34461135630` on `101438a` (2026-09-10,
pre-080) reads `db-rls-smoke: 554 isolation case(s) passed.` and 629 − 554 = **75**. `550 + 79 = 629`
is a sum reconstructed from a remembered base, and A0's own probe file gives three different figures
(79, 18, 18).

**This makes two sentences in the previous state record false**, and they are not corrected here
because that file is the record of a different session and the correction belongs in a change of its
own: §1's table row "Isolation cases | **629** (550 → 629)" and §2's "**79** isolation cases". Owed to
A0. The batch 080 evidence and handoff carry the same figure.

Q0 hand-simulated all 75 and judged **none wrong** — every case demands the outcome PostgreSQL would
produce, on the layer it names, and every service case is a privilege refusal as claimed; its
partition of the 75 predicted CI's 7/12/4/2/3 exactly. It found **five right-for-the-wrong-reason**:
the four `anon` cases are refused at the schema and **would pass unchanged if 080 granted `anon`
everything**, and case [61]'s `why` claims a grant-layer refusal "LANDS when the negative control
disables RLS", which is false and contradicted by A0's own CI counts.

Q0's own probe tally is **11 run, 3 noticed, 8 missed**, including both of A0's known misses in new
spellings. Q0 states plainly that this is not a coverage measurement — 8 of the 11 were chosen
because it expected them to slip.

## 4. Two repository-wide defects found by batch 100

- **Every migration is capped at ~128 KiB and nothing recorded it.** `scripts/db/psql-driver.mjs:131`
  passes each migration as a single `--command` argv entry, and Linux caps one argv string at
  `MAX_ARG_STRLEN` = 131,072 bytes regardless of `ARG_MAX`. `070_research.sql` is **130,853 bytes —
  219 bytes under the ceiling**, cleared by nobody's design. Batch 100 hit `spawn E2BIG` for real (CI
  run `34753787430`, no statement reached), reduced its own file to 117,661 bytes and added a size
  rule with 070 grandfathered by name. It deliberately did **not** rewrite the driver to feed stdin:
  `invoke` is the hot path for all 705 cases and `-c` wraps statements differently from a file read,
  so rewriting it in an author batch with three siblings in flight was the wrong trade. Left as
  blocker 12, owed to A0.
- **A witness that compares across types reports the wrong answer, and this is its second
  occurrence.** Batch 100's first run to reach the database went red on 2 of 705:
  `editor-a-cannot-allow-paid-ads-on-an-asset-rights` and its approver twin, "the write was NOT
  stopped. `paid_ads_allowed` is `"f"` and should still be false." **The policy had stopped the
  write.** The driver returns every value as CSV text and `run-isolation.mjs` compares with `!==`, so
  a boolean read raw arrives as `"f"` and `equals: false` can never match — the case could only ever
  fail, whatever the policy did. Fixed by casting `paid_ads_allowed::text` and comparing `'false'`
  (chosen over `'f'` so it does not depend on how psql renders a boolean), and a second unused builder
  carrying the same latent error was deleted rather than left for the next batch to copy.
  `tests/db/identity/isolation-cases.mjs:2951` records the first occurrence — `equals: null` against a
  CSV that has no NULL — in the same words. **No guard yet holds a witness to a type the driver can
  actually return**, and the four earlier cases and these two both passed every local run. Proposed as
  a blocker; not yet written.

Batch 100 recorded the caveat that makes its own probe tally honest, and it generalises to every probe
record in this package: **every probe mutates source and is judged by the static suite, so a 21-of-24
tally was fully consistent with a suite containing two assertions that could never pass.**

## 5. Where the coordinating session was wrong

Recorded because a record that only lists what the subagents got wrong is not a record.

The coordinator asserted twice, wrongly, that C0's H3 was falsified — first by inferring from A1's
green CI without measuring the tree, then by instructing C0 to restore the finding in a restated form
(`cannot hold a green tree past its first commit`) that was also wrong. C0 refused the second
instruction, produced a counter-measurement on its own branch, and supplied the correct rule (§3.4).
C0 recorded in its own §0 that pressure to change a finding is not evidence in either direction — it
withdrew on the first message because a measurement warranted it, and declined on the second because
by then it had one of its own.

**The mechanism that produced the right answer here was a subagent willing to contradict the run that
spawned it.** That worked because every brief instructed its run to correct the brief if the brief was
wrong, and three of the six did so. It is not a control. It is the same dependency the §0 disclosures
name, and it is one more reason this fan-out is not the independent review the protocol requires.

## 6. What is owed, and to whom

**Decisions only the Product Owner can make:**

1. **S8 (§3.1)** — stop-the-line, in an integrated migration. Note the three repairs that must not be
   taken.
2. **The CI/tree divergence (§3.3)** — whether a "green required CI run" under RFC-2026-002 still
   means what it is relied on to mean.
3. **A `product-owner-disposition-*.md` for the merge of PR #112.** The previous record's §1 asked the
   next session to decide whether one is owed, and this session's answer is **yes**: the only record
   of a merge that went ahead without four of five RFC-2026-002 signatures is a paragraph inside a
   file that disclaims all authority, written by the Author — the party forbidden to approve its own
   work. The precedent shape is `product-owner-disposition-batch-070.md`, which records the Owner's
   own words and explicitly does **not** waive the signatures. Scope it to #112 **and** to the
   package-wide pattern, since the same absence holds for every increment in this package's history.
   **No agent may write it**: a disposition on a paraphrase is a disposition on nothing.
4. **Integration order, or whether to hold** (§7).

**Owed to A0:** the `550`/`79` corrections (§3.5); the driver stdin fix (§4); the `docs/handoffs/db-00/**`
dead writable-paths entry, unchanged from the previous record; a witness-type guard (§4).

**Still absent, and the oldest debt here:** independent Reviewer, Tester and Security evidence *as
signatures*. PRs #114–#116 are **evidence, not signatures** — every one of them says so in its own §0,
none advances a status, and all three are same-vendor subagents of the Author. Batches 081, 090 and
100 have no role runs of their own at all.

## 7. Integration, which has not started

All six branches repoint the single `ownership.branch` slot **and** edit the `BRANCH_OWNERSHIP` table
in `test-kits/branch-identity.test.mjs`, which pins the whole branch→package map. The three batches
additionally touch the same seven shared files (`isolation-cases.mjs`, `identity-isolation.test.mjs`,
`catalog-snapshot.json`, `fixture-catalog.json`, `ci.yml`, `test-suite-contract.mjs`, the manifest).
**They conflict by construction.** Merge one, rebase the next, repoint, regenerate
`integrity-manifest.json` and `evidence/VERIFICATION.md` — never hand-merge them. The order §3 of the
previous record proposed still holds: **081 → 090 → 100**, the three independent §6 leaves.

Two warnings for whoever integrates:

- **Batch 100 narrowed two shared rules** — `servicePolicyMapLint`'s closed field set, and the new
  migration size bound. A sibling rebased past them may fail on a rule that did not exist when it was
  written.
- **The case counts do not add.** 665, 712 and 705 are each `629` plus one batch. Only a real merge
  produces the real number, and the negative-control basis must be re-read from CI rather than summed.

## 8. Housekeeping, unchanged from the previous record except where marked

- The six `worktree-agent-*` directories from the CUT fan-out are gone; **two stale branch refs remain**
  (`worktree-agent-a8f144ab47c11e650`, `worktree-agent-aaedf66a7878b225d`) and can be deleted. This
  session's own six worktrees are live and hold the six branches under review.
- 10 merged local `agent/claude/*` branches (0 ahead); `con007-prev`, `con008-old/prev/prev2` are
  pre-rebase remnants — confirm before deleting.
- `docs/handoffs/db-00/**` in `writable_paths` is still DEAD (`docs/**` in `read_only_paths` wins;
  `scripts/validate-work-package-ownership.mjs` exits 69). This record is under `evidence/` for that
  reason.
- `npm run check:scope` **takes no default arguments** — it prints usage and exits 0, so it is not
  evidence of anything. Batch 081 found this and recorded
  `node scripts/verify-branch-scope.mjs main WP-0A-DB-00` instead. Do not cite the npm script.
