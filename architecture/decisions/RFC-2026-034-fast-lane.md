# RFC-2026-034: fast lane -- application code on Candidate contracts, lighter per-PR review, audits in rounds

Status: **Proposed.** The Product Owner chose the direction on 2026-10-10, answering A0's question at 19:03:54Z (asked
19:02:50Z, session `c2816eec`) with `ทางกลาง (Recommended)`; the question, its options and the answer are transcribed in
`evidence/WP-0A-A0-001/product-owner-disposition-2026-10-11-fast-lane.md`. The text below is A0's drafting of that
direction, revised twice after role rounds (round one: C0-251-1..11, A1-251-1..10, R0-251-1..9, Q0-251-2..6; re-read:
C0-251r-1..9, A1-251r-1..6, R0-251-10..15 and -2r, -3r, Q0-251-7..11). It is not in effect until the Order of §10 is complete: the
Owner answers §9 himself, A0 records his answers and sets the status line, the roles re-read, and the Owner merges this
PR personally (a governance PR under RFC-2026-025 §5 item 6). Where the Owner chooses an alternative in §9, §2 to §4
and §7 change to match before he merges.
Date: 2026-10-11
Author: `/claude/a0_atlas` (A0), as an increment of `WP-0A-A0-001`, which owns `CONTRIBUTING_AGENTS.md`
Owner: the Product Owner
Protocol version: `1.0.0`
Amends, once in effect (each named in §3): `CONTRIBUTING_AGENTS.md` (five passages, §7); RFC-2026-030 §2 bullets 1 and
4, §3, §3.1, §3.2 and §3.3; RFC-2026-025 §5 and §6.4 as they require four roles on each pull request; RFC-2026-002's
per-merge evidence clause; RFC-2026-031 §3.3 "Consumers", §6 item 2 and §9; Decision Register line 373 and §5.1 lines
190–191, and the 2026-10-08 disposition §10.3, as to writing and merging application code only.

---

## 1. Why

From 2026-10-09 to 10-11 every pull request, records included, was read by four roles on its final head before A0
pressed it, as the Owner directed for that session. Six PRs took a night. The Owner asked at 19:02:26Z whether the rule
could be dropped, development sped up, and the audit done once. A0 answered that a single audit at the end is cheap for
presentation and ordinary logic but expensive for tenant isolation, auth, secrets and payment, where a defect found late
means a leak or a wrong charge and an integrated migration can only be forward-fixed. The Owner chose the middle course.

Two things slow the work:

1. **The gate.** `CONTRIBUTING_AGENTS.md` "Current gate constraint" and Decision Register line 373 say that until G0
   passes, agents may work only on spikes, prototypes, fixtures, fake adapters, contract tests and reversible foundation
   that binds no production schema or external provider. The Owner confirmed on 2026-10-08 (disposition §10.3) that this
   binds until the thirteen First-Slice contracts are `Frozen` and a PR amends the gate text (RFC-2026-031 §3.3, §6, §9).
   All thirteen are `Candidate`; none is `Frozen`. So no application code can be written.
2. **Review depth.** Under RFC-2026-030, every pull request is tier H until CI prints the tier (its §9 item 2, not yet
   met), every module is H until it is named on the reviewed module allowlist, and tier H is read by every role.

**What this RFC changes in practice, stated plainly.** The gate change (§2.1) lets application work start. The lighter
review (§2.2) applies at once to tier H pull requests outside governance: two readers (A1, Q0) instead of four. The
fast lane for tier M and L opens only once CI prints the tier (§8 item 2), and for module code only once a module is
named on the allowlist, which RFC-2026-030 forbids for tenancy, identity, secrets, jobs and provider modules (§2.2).
First-Slice platform code therefore stays in the risk lane.

## 2. The decision

### 2.1 Application code on `Candidate` contracts, still reversible and synthetic

Before the G0 exit closes, agents may write application code, fakes and consumer tests against contracts at
`Candidate` or above, and merge them to `main`, **as reversible work**:

- **Synthetic data only.** No real customer data until the PDPA work passes (D0 of the plan approved 2026-10-08).
- **No production schema.** Migrations run on local databases only; nothing is applied to a hosted or production
  project.
- **No external provider bound.** Providers are faked; no provider account, sandbox or test accounts included, is bound,
  and no credential of any provider is used, exactly as the gate says today (Q0-251-8). Hosted staging and provider
  sandboxes are a later decision, outside this RFC.

This widens the gate's work list without removing the gate: it replaces "spikes, prototypes, fixtures, fake
adapters, contract tests" with application code, under the same reversibility.

Also:

- **The G0 exit** stays "decided, conditional" and closes only when all thirteen First-Slice contracts are `Frozen`
  **and** a later PR amends the gate text to say the exit has closed. This PR amends the gate text but **does not** count
  as RFC-2026-031 §6 item 2's PR; that is a narrowing of §6 item 2, declared in §3.
- **`Frozen` before production use.** Before any paid beta, real customer data, or production deploy that serves users,
  every contract that deploy uses is `Frozen` under RFC-2026-031 (not only the First Slice).
- A breaking change to a `Candidate` contract follows its owner and the RFC path, as today. Freeze PRs and changes to
  a `Frozen` contract keep RFC-2026-031's own role rules (§4 there), whatever their lane.

### 2.2 Four lanes, from the base's classifier, failing closed

The tier is still printed by the **base's copy** of `scripts/db/classify-review-tier.mjs` and never lowered by hand;
anything it cannot place is H; until CI prints it on every pull request, every pull request is H (RFC-2026-030 §9 item 2,
unchanged). The lane follows the tier and the paths:

| Lane | What it covers | Before merge | Integration Owner (R0) | Who presses |
|---|---|---|---|---|
| **Governance** | any change to: `architecture/decisions/**`, `CONTRIBUTING_AGENTS.md`, `docs/**`, `.github/**`, `package.json`, any lockfile or tool configuration, either classifier, any script or test file CI runs as a guard (`scripts/verify-*.mjs`, `scripts/scan-repository-secrets.mjs`, `scripts/refresh-author-handoff.mjs`, `scripts/run-test-suite.mjs`, `scripts/db/classify-*.mjs`), and a hand edit of which files `test-kits/integrity-manifest.json` digests. **If it is unclear whether a path is a guard, it is governance.** | as today: every role | as today, per PR | the Owner personally (RFC-2026-025 §5 item 6), or A0 for a PR the Owner names in his own words, as in the 2026-10-08 disposition §10.2 |
| **Records** | RFC-2026-025 §6.1 | as today: one independent reading (§6.2) | as §6.2 says | as §6 says |
| **Risk** | every other tier H pull request: migrations, RLS, grants, schema; auth, sessions, identity, tenancy, roles; secrets, OAuth, credentials; billing, payments, webhooks; publishing, jobs, queues, storage and deletion, provider adapters, mail and notifications; contracts; other scripts and test kits; work-package scope, roles and status moves; any module not on the allowlist; anything unplaced | **A1 (Security/Privacy) and Q0 (Tester)** pass on the final head; a stop-the-line or security finding adds C0 and R0 at once | in the round audit (§2.3) | A0 (Q-034-1) |
| **Fast** | tier M and L only | green CI **and one independent Reviewer (C0)** who confirms in writing what the classifier cannot: for L, behind a feature flag and no data path; for M, the test exercises the changed code (RFC-2026-030 §2 bullet 4) (Q-034-4) | in the round audit (§2.3) | A0 (Q-034-1) |

- A regeneration of `test-kits/integrity-manifest.json` that only records the digests of files the pull request itself
  adds or changes follows those files' lane; anything else in that file is governance.
- A pull request never drops lane during its life; a security finding raises it to tier H's full reading.
- **Module code.** A module is on the allowlist only by a governance PR, and RFC-2026-030 §4.2 item 6 never admits
  modules that own tenancy, identity, secrets, jobs or provider calls. First-Slice platform code lives in such a module
  (RFC-2026-029's `src/modules/platform-kernel`), so it takes the risk lane. Q-034-2 asks only about modules item 6
  admits.
- **Pressing is not integrating.** Under this RFC A0 presses the merge of risk-lane and fast-lane pull requests it
  authored, once the lane's readers have passed and CI is green on the exact head. The independent Integration Owner's
  verdict is given in the audit (§2.3), and a package moves past `in_review` only on it. This reverses the Owner's
  answer to Q-030-5 of 2026-10-08 ((a): the presser of an M or L merge is not its Author); Q-034-1 puts that to him.

### 2.3 Audits in rounds

- **When.** Once a week; before each gate (G1 exit, G2 exit, paid beta); and before the first real customer data and
  the first production deploy that serves users; whichever comes first (Q-034-3).
- **Who.** C0, A1, Q0 and R0, each a run other than the Author's, read the cumulative diff on `main` since the last
  audit, every PR's tier output and lane, and CI on `main`. Each writes its file under `evidence/audits/<date>/`, a path
  this PR gives to `WP-0A-A0-001`. **The audit pull request** holds only the auditors' own files on WP-0A-A0-001's
  branch; each file is its own reading, so no further reader is needed, and A0 presses it once CI is green on its exact
  head (Q0-251-9). An audit pull request that changes anything else takes that change's lane.
- **What they decide.** C0's audit verdict is the `review_approved`, Q0's the `test_verified`, and R0's the
  `integration_verified` for the risk-lane and fast-lane work each covers; A1's audit finding of any grade blocks those
  moves until fixed. Findings become fix PRs, each laned on its own; a lane error is itself a finding. A stop-the-line
  finding stops the line at once.

### 2.4 What does not change

- The non-negotiable security and data rules of `CONTRIBUTING_AGENTS.md`, word for word.
- No direct push to `main`; every change through a pull request, a true merge commit pinned with
  `--match-head-commit`, green CI on that head, the head containing current `main`.
- Separate roles exist and are held by runs other than the Author's; the Author never writes another role's verdict.
- Ownership, `writable_paths`, amendment declarations, `verify-branch-scope`, and the classifier itself.
- Governance and records pull requests, and who presses them.
- Pull requests opened before this RFC takes effect finish under the rules they started under.

## 3. What it amends, exactly

| Rule | Amended how |
|---|---|
| `CONTRIBUTING_AGENTS.md` "Current gate constraint" | §7 (a) |
| `CONTRIBUTING_AGENTS.md` "Separation of duties" ¶1 | §7 (b) |
| `CONTRIBUTING_AGENTS.md` "Verification and handoff" ¶2 | §7 (c) |
| `CONTRIBUTING_AGENTS.md` "Temporary manual merge control", bullets 2 and 4 | §7 (d), (e) |
| RFC-2026-030 §2 bullet 1 ("the merge of an M or L PR is pressed by a run that is not the Author's") and §3.1 "Who presses the merge" | A0 may press per §2.2 (Q-034-1); pressing is not integrating |
| RFC-2026-030 §2 bullet 4 and §3.3 | the fast lane keeps one Reviewer's written confirmation and drops the per-PR Tester (Q-034-4) |
| RFC-2026-030 §3 table, "Per-PR review" and "Integration Owner" columns | as §2.2's table |
| RFC-2026-030 §3.2 | the end-of-package R0 verdict becomes the round audit (§2.3) |
| RFC-2026-025 §5 and §6.4, as they require C0, A1, Q0 and R0 on each pull request under the standing delegation | for the risk and fast lanes, §2.2; §5 item 6 and §6.1–§6.3 unchanged |
| RFC-2026-002 Decision item 1 ("merge an undrafted/unreviewed change"), item 2 (the handoff links the independent Reviewer, Tester, conditional reviewers and Integration Owner verdict) and item 3 ("the Author cannot … integrate, or authorize their own work"; "the Product Owner may perform the final manual merge"), and its "Evidence and review" list | for the risk and fast lanes: "reviewed" means the lane's readers of §2.2; the handoff links those readers and, later, the audit verdict; pressing is not integrating (§2.2); A0 may press (Q-034-1). Items 4 and 5 unchanged (Q0-251-11) |
| RFC-2026-031 §3.3 "Consumers" and §9 ("binds unchanged until §6 holds"); Decision Register line 373 and §5.1 lines 190–191; 2026-10-08 disposition §10.3 | as to writing and merging application code only, §2.1 |
| RFC-2026-031 §6 item 2 | narrowed: this PR does not count as the PR that amends the gate text; a later PR that says the exit has closed does |

Not amended: RFC-2026-030 §2 bullets 2 and 3, §4, §5 (misclassification), §6 (stop-the-line at any tier), §9; RFC-2026-031
§2, §4, §5, §6 item 1, §7; RFC-2026-025 §5 item 6 and §6.

## 4. Risks, stated

- **Late discovery.** A defect may live up to a week before R0 reads it. Mitigation: risk-lane PRs are read by A1 and
  Q0 before merge; fast-lane PRs by C0; CI runs on every head; an audit precedes every gate and the first real data.
- **The Author presses.** Mitigation: every lane keeps at least one independent reading before merge; the audit gives
  the integration verdict.
- **Smaller gain than hoped at first.** Until CI prints the tier, and for First-Slice platform code always, the gain is
  two readers instead of four, plus the gate change.

## 5. Effect on RFC-2026-031

Its freeze rule, freeze review and declared-gap policy stand, and they now gate production use (§2.1) as well as the G0
exit. Its §6 item 2 is narrowed as §3 says.

## 6. Who owns the audit directory

`evidence/audits/**` is added to `WP-0A-A0-001`'s `writable_paths` on this PR.

## 7. The `CONTRIBUTING_AGENTS.md` passages it amends (applied on this PR)

(a) "Current gate constraint" becomes:

> Sprint 0A is **Specification Baseline Complete / External Verification Pending**; the G0 exit is decided and conditional, and closes only as [`RFC-2026-031`](architecture/decisions/RFC-2026-031-first-slice-contract-freeze.md) §6 says, as narrowed by [`RFC-2026-034`](architecture/decisions/RFC-2026-034-fast-lane.md). Until then agents may build application code, fakes, consumer tests, fixtures, spikes and prototypes against contracts at `Candidate` or above (RFC-2026-034 §2.1), as reversible work only: synthetic data; migrations on local databases only, never on a hosted or production project; and no external provider account, sandbox included, bound and no provider credential used. Every contract a deploy uses is `Frozen` (RFC-2026-031) before any paid beta, real customer data, or production deploy that serves users. Do not represent a package as `Ready`, `Integrated`, `Verified`, or `Done` without the evidence and independent roles required by the package.

(b) "Separation of duties", first paragraph, becomes:

> Every implementation package has distinct Author, Independent Reviewer, Independent Tester, and Integration Owner, and no role is ever held by the Author's run. When they read each pull request follows its lane under [`RFC-2026-034`](architecture/decisions/RFC-2026-034-fast-lane.md) §2.2, which keeps the tiers of [`RFC-2026-030`](architecture/decisions/RFC-2026-030-risk-tiered-review.md), decided by the base's copy of `scripts/db/classify-review-tier.mjs` and never lowered by hand: governance pull requests (RFCs, this guide, gates, CI and the guards it runs, either classifier, `package.json`, lockfiles and tool configuration) are read by every role and merged by the Product Owner under RFC-2026-025 §5; records-only pull requests follow RFC-2026-025 §6; every other tier H pull request (migrations and RLS, auth and tenancy, secrets and OAuth, billing, publishing, jobs and provider adapters, contracts, scripts and test kits, every module not on the reviewed module allowlist, and anything the classifier cannot place) is read by the Security/Privacy reviewer and the Tester on its final head before merge; tier M and L pull requests are read by one independent Reviewer, who confirms in writing what the classifier cannot. The Reviewer, Tester, Security/Privacy reviewer and Integration Owner read all merged risk-lane and fast-lane work in the round audits of RFC-2026-034 §2.3, whose verdicts move a package past `in_review`. A stop-the-line or security finding raises any pull request to tier H and its full reading. The Author may move work only through `in_review`; an Author must never approve, test-verify, integrate, or gate-approve their own work; pressing the merge of a risk-lane or fast-lane pull request after its lane's readers have passed is not integrating it (RFC-2026-034 §2.2). Critical work additionally requires the appropriate independent Security/Privacy, Product/UX, Domain, or SRE reviewer.

(c) "Verification and handoff", second paragraph, becomes:

> Before any commit or push, the Author must provide a clean diff and self-test evidence. What must pass before a merge follows the lane of RFC-2026-034 §2.2: for a governance pull request, the independent Reviewer, Tester and Security/Privacy reviewer complete their checks and the Integration Owner verifies the final state and CI; for a risk-lane pull request, the Security/Privacy reviewer and the Tester; for a fast-lane pull request, one independent Reviewer; for a records-only pull request, RFC-2026-025 §6. Every merge needs green required CI on its exact head. Pushing branch-protection settings or production configuration requires authorized repository/operations ownership and must not be inferred from this guide.

(d) "Temporary manual merge control", second bullet, becomes:

> - Before a merge, the head commit must have a green required CI run and the linked evidence its lane requires under RFC-2026-034 §2.2: Author, independent Reviewer, independent Tester, Security/Privacy and Integration Owner evidence for a governance pull request; Security/Privacy and Tester evidence for a risk-lane pull request; the independent Reviewer's written confirmation for a fast-lane pull request. The Integration Owner's verdict on risk-lane and fast-lane work follows in the round audit (RFC-2026-034 §2.3).

(e) "Temporary manual merge control", fourth bullet, becomes:

> - The Author never approves, test-verifies, integrates, or authorizes their own work; pressing the merge of a risk-lane or fast-lane pull request after its lane's readers have passed is not integrating it (RFC-2026-034 §2.2). A manual merge cannot waive an unresolved stop-the-line risk.

## 8. Owed after the Owner merges

1. The first round audit within seven days, under `evidence/audits/`.
2. **CI prints the tier and the lane on every pull request** (a governance PR: `.github/workflows/ci.yml` is
   WP-0A-A0-004's, the classifier WP-0A-DB-00's). Until then every pull request is H (RFC-2026-030 §9 item 2), so the
   fast lane is closed and only the risk lane's lighter reading applies.
3. Status-line notes that RFC-2026-034 amends them: RFC-2026-002, RFC-2026-025, RFC-2026-030, RFC-2026-031, each by its
   owner; a note on Decision Register line 373 and §5.1 by the register's owner; WP-0A-A0-010 `open_blockers[1]` and the
   G0 tracker's G0-024.
4. **CI runs application tests** (a governance PR), so tests of application code under `src/` and `apps/` run on every
   head; today `scripts/run-test-suite.mjs` runs only `test-kits/` and `tests/`.
5. When RFC-2026-029's layout lands, item 4 is on `main`, and Q-034-2 is answered yes, the governance PR that names the
   eligible modules in `M_ELIGIBLE_MODULES`.

## 9. Questions for the Owner

- **Q-034-1. Who presses.** In the risk and fast lanes, A0 presses the merge, including pull requests A0 authored, once
  the lane's readers have passed and CI is green; R0 gives the integration verdict in the audit. This reverses your
  answer to Q-030-5 of 2026-10-08 ((a), the presser is not the Author). A0 recommends yes, for speed. The alternative
  keeps Q-030-5 (a): a run other than the Author presses, which needs a second run awake for every merge.
- **Q-034-2. Naming modules.** When RFC-2026-029's layout lands, name in `M_ELIGIBLE_MODULES`, in one governance PR,
  every module that RFC-2026-030 §4.2 item 6 admits (none that owns tenancy, identity, secrets, jobs or provider calls),
  so ordinary code in them takes the fast lane, **but only after CI runs application tests (§8 item 4)**, so a module's
  own tests run on every fast-lane head (Q0-251-10). A0 recommends yes. The alternative is to name them one by one.
- **Q-034-3. Audit cadence.** Weekly; before each gate; and before the first real customer data and the first
  production deploy that serves users. A0 recommends this. The alternative is every 10 merged risk-lane or fast-lane PRs.
- **Q-034-4. The fast lane's reading.** Your chosen option said fast-lane pull requests pass on automatic CI. A0
  recommends keeping **one independent Reviewer** per fast-lane pull request, because the classifier cannot tell
  whether web code is behind a feature flag and has no data path (A1 measured four component diffs, including
  `innerHTML` and an aliased `fetch` POST, that it prints as L), and RFC-2026-030 §2 relies on that written
  confirmation. The alternative is CI only, as your option text said, with the Author recording those confirmations
  and the audit checking them.

## 10. Order before the merge

1. The Owner answers Q-034-1 to Q-034-4 himself, in chat; no broad delegation answers them.
2. A0, in one commit: transcribes his answers with transcript times into the disposition; amends §2, §3, §4 and §7 to
   match any alternative he chose; sets the status line to Approved.
3. C0, A1, Q0 and R0 re-read that commit on the final head.
4. The head contains current `main`; CI is green on it; the Owner merges it personally with `--match-head-commit`.

## 11. Rollback

A reviewed governance PR that reverts this RFC and the five `CONTRIBUTING_AGENTS.md` passages restores RFC-2026-030's
review depth and the earlier gate text. Work merged under the risk or fast lane stays; the next audit covers it.
