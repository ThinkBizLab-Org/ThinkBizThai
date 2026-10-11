# RFC-2026-034: fast lane -- application code on Candidate contracts, lighter per-PR review, audits in rounds

Status: **Proposed.** The Product Owner chose the direction on 2026-10-10, answering A0's question at 19:03:54Z (asked
19:02:50Z, session `c2816eec`) with `ทางกลาง (Recommended)`; the question, its options and the answer are transcribed in
`evidence/WP-0A-A0-001/product-owner-disposition-2026-10-11-fast-lane.md`. The text below is A0's drafting of that
direction, revised five times after role rounds (round one: C0-251-1..11, A1-251-1..10, R0-251-1..9, Q0-251-2..6; re-read:
C0-251r-1..9, A1-251r-1..6, R0-251-10..15 and -2r, -3r, Q0-251-7..11; second re-read: C0-251r2-1..9,
A1-251r2-1..7, R0-251-16..23, Q0-251-12..14; third re-read: C0-251r3-1..10, A1-251r3-1..4,
R0-251-24..28, Q0-251-13..16; fourth re-read: C0-251r4-1..6, A1-251r4-1..5, R0-251-24, -29, -30, Q0-251-17..21). It is not in effect until the Order of §10 is complete: the
Owner answers §9 himself, A0 records his answers and sets the status line, the roles re-read, and the Owner merges this
PR personally (a governance PR under RFC-2026-025 §5 item 6). Where the Owner chooses an alternative in §9, §2 to §4
and §7 change to match before he merges.
Date: 2026-10-11
Author: `/claude/a0_atlas` (A0), as an increment of `WP-0A-A0-001`, which owns `CONTRIBUTING_AGENTS.md`
Owner: the Product Owner
Protocol version: `1.0.0`
Amends, once in effect (each named in §3): `CONTRIBUTING_AGENTS.md` (six passages, §7); RFC-2026-030 §2 bullets 1 and
4, §3, §3.1, §3.2, §3.3, and §4.1 rule 3 and §4.5 as to who confirms M's test; RFC-2026-025 §5 and §6.4 as they require four roles on each pull request, and the full path for an
audit pull request (either option of Q-034-5); RFC-2026-002 Decision items 1 to 3 and its "Evidence and review" list; RFC-2026-031 §3.3 "Consumers", §6 item 2 and §9; Decision Register line 373 and §5.1 lines
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
review (§2.2) applies at once to tier H pull requests outside governance: two readers (A1, Q0) instead of four. A
migration batch that also adds pins, proofs, tests or registry entries to the guards keeps that lighter reading only
while those guard edits are additive, as A1 and Q0 each confirm in writing (§2.2); any other guard edit makes the pull
request governance. The fast lane for tier M and L opens only once CI prints the tier (§8 item 2), and for module code only once a module is
named on the allowlist, which RFC-2026-030 §4.2 item 6 forbids for any module that owns identity, tenancy, IAM, sessions,
secrets, billing, entitlement, publishing, connectors, uploads, jobs or provider calls (§2.2).
First-Slice platform code therefore stays in the risk lane.

## 2. The decision

### 2.1 Application code on `Candidate` contracts, still reversible and synthetic

Before the G0 exit closes, agents may write application code, fakes and consumer tests against contracts at
`Candidate` or above, and merge them to `main`, **as reversible work**:

- **Synthetic data only.** No real customer data until the PDPA work passes (D0 of the plan approved 2026-10-08).
- **No production schema.** Migrations run on local databases and on CI's throwaway service-container database only;
  nothing is applied to a hosted or production project.
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
| **Governance** | any change to: `architecture/decisions/**`, `CONTRIBUTING_AGENTS.md`, `docs/**`, `.agents/**`, `.github/**`, `package.json`, any lockfile or tool configuration, either classifier, and any script or test CI runs as a guard or runner: `scripts/verify-*.mjs`, `scripts/validate-*.mjs`, `scripts/*-contract.mjs`, `scripts/scan-repository-secrets.mjs`, `scripts/refresh-author-handoff.mjs`, `scripts/run-test-suite.mjs`, `scripts/record-verification.mjs`, `scripts/regenerate-integrity-manifest.mjs`, `scripts/db/classify-*.mjs`, `scripts/db/run.mjs`, the database test harness (`scripts/db/rls-smoke.mjs`, `scripts/db/authz-proofs.mjs`, `db/foundation/ci/**`) and every module any of them imports, the `Makefile` targets CI runs, the top-level `test-kits/*.test.mjs` guard tests, any test whose subject is a governance path (for example the classifier's pins in `test-kits/db/foundation-contract.test.mjs`), and a hand edit of which files `test-kits/integrity-manifest.json` digests. **If it is unclear whether a path is a guard or runner, it is governance.** An additive guard edit (below) follows the change it serves. Other test cases a runner executes (`tests/**`, `test-kits/db/**`, `test-kits/contracts/**`) are not guards. | as today: every role | as today, per PR | as today under RFC-2026-025 §5 item 6 (see below) |
| **Records** | RFC-2026-025 §6.1 | as today: one independent reading (§6.2) | as §6.2 says | as §6 says |
| **Risk** | every other tier H pull request except an audit pull request: migrations, RLS, grants, schema; auth, sessions, identity, tenancy, roles; secrets, OAuth, credentials; billing, payments, webhooks; publishing, jobs, queues, storage and deletion, provider adapters, mail and notifications; contracts; other scripts and test kits; work-package scope, roles and status moves; any module not on the allowlist; anything unplaced | **A1 (Security/Privacy) and Q0 (Tester)** pass on the final head; a stop-the-line or security finding adds C0 and R0 at once | in the round audit (§2.3) | A0 (Q-034-1) |
| **Fast** | tier M and L only | green CI **and one independent Reviewer (C0)** who confirms in writing what the classifier cannot: for L, behind a feature flag and no data path; for M, the test exercises the changed code (RFC-2026-030 §2 bullet 4) (Q-034-4) | in the round audit (§2.3) | A0 (Q-034-1) |
| **Audit** | a pull request on WP-0A-A0-001's current branch that holds only the round audit's files under `evidence/audits/<date>/` (§2.3) | all four auditors' files present, each carried with `cherry-pick -x` from its auditor's own commit, blob-equal, touching no other path, and green CI (Q-034-5 (a)); or one more independent reading (Q-034-5 (b)) | the audit is R0's reading | A0, in either option of Q-034-5 |

- **Additive guard edits follow the change they serve** (R0-251-24, R0-251-29, A1-251r4-1, -2, -4, Q0-251-17, -19). An edit to a
  guard, runner, registry or the manifest named above follows the lane of the change it serves, not governance, when it
  only **adds** what that change needs, or tightens an existing check for it, and removes or loosens nothing:
  - pins, lint rules, proofs and self-tests for the objects the pull request itself adds, in `scripts/db/run.mjs`, the
    database test harness or a module they import;
  - new tests, in any test file, including `test-kits/db/foundation-contract.test.mjs`;
  - in a registry, a new entry for a file the pull request adds, a raised count or floor, and a changed name digest for
    a test file whose diff removes no `test(` line (a test name in `scripts/test-suite-contract.mjs`, a path in
    `DIGESTED_FLOOR` of `scripts/verify-test-coverage-floor.mjs`, a row for a **new** branch in
    `test-kits/branch-identity.test.mjs`);
  - a regeneration of `test-kits/integrity-manifest.json` that only records the digests of files the pull request
    adds or changes.

  The edit is additive only if **A1 and Q0 each confirm so in writing on the final head**, each having read every
  guard hunk; until both have, and whenever either does not, the pull request is governance. Anything else is
  governance: removing or renaming a test, pin, check or entry; a lowered count or floor; a moved or removed branch
  row; a changed exit code, entry point, lock or the way a runner runs; an edit to a classifier, to CI, or to the
  classifier's own pins. **If it is unclear whether an edit is additive, it is governance.**
- **Who presses governance.** As today under RFC-2026-025 §5 item 6. This RFC neither adds nor ends any standing
  direction the Owner has given under that rule (the 2026-10-08 disposition §10.2; the 2026-10-09 NTF-A5 disposition,
  Q3); each keeps the reach it already has. This PR itself is merged by the Owner personally (§10).
- A pull request never drops lane during its life; a security finding raises it to tier H's full reading.
- **Module code.** A module is on the allowlist only by a governance PR, and RFC-2026-030 §4.2 item 6 never admits a
  module that owns identity, tenancy, IAM, sessions, secrets, billing, entitlement, publishing, connectors, uploads, jobs
  or provider calls, and requires a test per module class. First-Slice platform code lives in such a module
  (RFC-2026-029's `src/modules/platform-kernel`), so it takes the risk lane. Q-034-2 asks only about modules item 6
  admits.
- **Pressing is not integrating.** Under this RFC A0 presses the merge of risk-lane and fast-lane pull requests it
  authored, once the lane's readers have passed and CI is green on the exact head. The independent Integration Owner's
  verdict is given in the audit (§2.3), and a package moves past `in_review` only on it. This reverses the Owner's
  answer to Q-030-5 of 2026-10-08 ((a): the presser of an M or L merge is not its Author) and goes beyond its option
  (b) (the Author presses an M or L merge on recorded Reviewer and Tester verdicts), because it also covers tier H outside
  governance; Q-034-1 puts that to him.

### 2.3 Audits in rounds

- **When.** Once a week; before each gate (G1 exit, G2 exit, paid beta); and before the first real customer data and
  the first production deploy that serves users; whichever comes first (Q-034-3).
- **Who.** C0, A1, Q0 and R0, each a run other than the Author's, read the cumulative diff on `main` since the last
  audit, every PR's tier output and lane, and CI on `main`. Each writes its file under `evidence/audits/<date>/`, a path
  this PR gives to `WP-0A-A0-001`. **The audit pull request** holds only the auditors' own files on WP-0A-A0-001's
  branch and takes the Audit lane of §2.2 (Q-034-5). An audit pull request that changes anything else takes that
  change's lane. Its files are role verdicts, not records (RFC-2026-025 §6.1 item 2), which is why it has a lane of its
  own.
- **What they decide.** C0's audit verdict is the `review_approved`, Q0's the `test_verified`, and R0's the
  `integration_verified` for the risk-lane and fast-lane work each covers; A1's audit finding of any grade blocks those
  moves until fixed. Findings become fix PRs, each laned on its own; a lane error is itself a finding. A stop-the-line
  finding stops the line at once.

### 2.4 What does not change

- The non-negotiable security and data rules of `CONTRIBUTING_AGENTS.md`, word for word.
- No direct push to `main`; every change through a pull request, a true merge commit pinned with
  `--match-head-commit`, green CI on that head, the head containing current `main`.
- Separate roles exist and are held by runs other than the Author's; the Author never writes another role's verdict.
- Ownership, `writable_paths`, amendment declarations, `verify-branch-scope`, the classifier itself, and
  `CONTRIBUTING_AGENTS.md` "Ownership and change control" (protected files through the Integration Owner/RFC path).
- Records pull requests and who presses them; governance pull requests and who presses them (RFC-2026-025 §5 item 6),
  except that §2.2 now names governance by path, adding `docs/**`, `.agents/**`, package files, lockfiles and the guards
  and runners CI uses, which narrows what any other lane may touch.
- Pull requests opened before this RFC takes effect finish under the rules they started under.

## 3. What it amends, exactly

| Rule | Amended how |
|---|---|
| `CONTRIBUTING_AGENTS.md` "Current gate constraint" | §7 (a) |
| `CONTRIBUTING_AGENTS.md` "Separation of duties" ¶1 | §7 (b) |
| `CONTRIBUTING_AGENTS.md` "Verification and handoff" ¶2 | §7 (c) |
| `CONTRIBUTING_AGENTS.md` "Temporary manual merge control", bullets 2 and 4 | §7 (d), (e); bullets 1, 3 and 5 unchanged |
| `CONTRIBUTING_AGENTS.md` "Work and evidence flow", the evidence-location sentence | §7 (f) |
| RFC-2026-030 §3.2's cadence ("10 merged M or L PRs or 7 days", the Owner's Q-030-2 answer) | replaced by §2.3's cadence (Q-034-3) |
| RFC-2026-030 §2 bullet 1 ("the merge of an M or L PR is pressed by a run that is not the Author's") and §3.1 "Who presses the merge" | A0 may press per §2.2 (Q-034-1); pressing is not integrating |
| RFC-2026-030 §2 bullet 4, §3.3, and §4.1 rule 3 and §4.5 (the M Tester confirms the test) | the fast lane keeps one Reviewer's written confirmation, who also confirms M's test, and drops the per-PR Tester (Q-034-4) |
| RFC-2026-030 §3 table, "Per-PR review" and "Integration Owner" columns | as §2.2's table |
| RFC-2026-030 §3.2 | the end-of-package R0 verdict becomes the round audit (§2.3) |
| RFC-2026-025 §5 and §6.4, as they require C0, A1, Q0 and R0 on each pull request under the standing delegation | for the risk and fast lanes, §2.2; for an audit pull request, as Q-034-5 answers; §5 item 6 and §6.1–§6.3 unchanged |
| RFC-2026-002 Decision item 1 ("merge an undrafted/unreviewed change"), item 2 (the handoff links the independent Reviewer, Tester, conditional reviewers and Integration Owner verdict) and item 3 ("the Author cannot … integrate, or authorize their own work"; "the Product Owner may perform the final manual merge"), and its "Evidence and review" list | for the risk and fast lanes: "reviewed" means the lane's readers of §2.2; the handoff links those readers and, later, the audit verdict; pressing is not integrating (§2.2); A0 may press (Q-034-1); for an audit pull request, item 1's "reviewed" is met as Q-034-5 answers (R0-251-30). Items 4 and 5 unchanged (Q0-251-11) |
| RFC-2026-031 §3.3 "Consumers" and §9 ("binds unchanged until §6 holds"); Decision Register line 373 and §5.1 lines 190–191; 2026-10-08 disposition §10.3 | as to writing and merging application code only, §2.1 |
| RFC-2026-031 §6 item 2 | narrowed: this PR does not count as the PR that amends the gate text; a later PR that says the exit has closed does |

Not amended: RFC-2026-030 §2 bullets 2 and 3, §4 other than §4.1 rule 3 and §4.5 as above, §5 (misclassification), §6
(stop-the-line at any tier), §9; RFC-2026-031 §2, §4, §5, §6 item 1, §7; RFC-2026-025 §5 item 6 and §6.1 to §6.3.

## 4. Risks, stated

- **Late discovery.** A defect may live up to a week before R0 reads it. Mitigation: risk-lane PRs are read by A1 and
  Q0 before merge; fast-lane PRs by C0; CI runs on every head; an audit precedes every gate and the first real data.
- **The Author presses.** Mitigation: every lane keeps at least one independent reading before merge; the audit gives
  the integration verdict.
- **Smaller gain than hoped at first.** Until CI prints the tier, and for First-Slice platform code always, the gain is
  two readers instead of four, plus the gate change; and a migration batch keeps that only while its guard edits are
  additive (§2.2); 22 of the 24 migration commits on `main` since 2026-09-20 edited a guard or a registry
  (R0-251-24), so each such batch needs A1's and Q0's written confirmation to stay in the risk lane.

## 5. Effect on RFC-2026-031

Its freeze rule, freeze review and declared-gap policy stand, and they now gate production use (§2.1) as well as the G0
exit. Its §6 item 2 is narrowed as §3 says.

## 6. Who owns the audit directory

`evidence/audits/**` is added to `WP-0A-A0-001`'s `writable_paths` on this PR.

## 7. The `CONTRIBUTING_AGENTS.md` passages it amends (applied on this PR)

(a) "Current gate constraint" becomes:

> Sprint 0A is **Specification Baseline Complete / External Verification Pending**; the G0 exit is decided and conditional, and closes only as [`RFC-2026-031`](architecture/decisions/RFC-2026-031-first-slice-contract-freeze.md) §6 says, as narrowed by [`RFC-2026-034`](architecture/decisions/RFC-2026-034-fast-lane.md). Until then agents may build application code, fakes, consumer tests, fixtures, spikes and prototypes against contracts at `Candidate` or above (RFC-2026-034 §2.1), as reversible work only: synthetic data; migrations on local and CI service-container databases only, never on a hosted or production project; and no external provider account, sandbox included, bound and no provider credential used. Every contract a deploy uses is `Frozen` (RFC-2026-031) before any paid beta, real customer data, or production deploy that serves users. Do not represent a package as `Ready`, `Integrated`, `Verified`, or `Done` without the evidence and independent roles required by the package.

(b) "Separation of duties", first paragraph, becomes:

> Every implementation package has distinct Author, Independent Reviewer, Independent Tester, and Integration Owner, and no role is ever held by the Author's run. When they read each pull request follows its lane under [`RFC-2026-034`](architecture/decisions/RFC-2026-034-fast-lane.md) §2.2, which keeps the tiers of [`RFC-2026-030`](architecture/decisions/RFC-2026-030-risk-tiered-review.md), decided by the base's copy of `scripts/db/classify-review-tier.mjs` and never lowered by hand: governance pull requests (RFCs, this guide, `docs/**`, `.agents/**`, gates, CI and the guards and runners it uses other than an additive guard edit RFC-2026-034 §2.2 names, either classifier, `package.json`, lockfiles and tool configuration) are read by every role and merged under RFC-2026-025 §5 item 6; records-only pull requests follow RFC-2026-025 §6; every other tier H pull request except a round audit's (migrations and RLS, auth and tenancy, secrets and OAuth, billing, publishing, jobs and provider adapters, contracts, whose freeze pull requests and changes to a `Frozen` contract also keep RFC-2026-031's roles, other scripts and test kits, every module not on the reviewed module allowlist, and anything the classifier cannot place) is read by the Security/Privacy reviewer and the Tester on its final head before merge; tier M and L pull requests are read by one independent Reviewer, who confirms in writing what the classifier cannot; a round audit's pull request takes the audit lane of RFC-2026-034 §2.2. The Reviewer, Tester, Security/Privacy reviewer and Integration Owner read all merged risk-lane and fast-lane work in the round audits of RFC-2026-034 §2.3, whose verdicts move a package past `in_review`. A stop-the-line or security finding raises any pull request to tier H and its full reading. The Author may move work only through `in_review`; an Author must never approve, test-verify, integrate, or gate-approve their own work; pressing the merge of a risk-lane or fast-lane pull request after its lane's readers have passed is not integrating it (RFC-2026-034 §2.2). Critical work additionally requires the appropriate independent Security/Privacy, Product/UX, Domain, or SRE reviewer.

(c) "Verification and handoff", second paragraph, becomes:

> Before any commit or push, the Author must provide a clean diff and self-test evidence. What must pass before a merge follows the lane of RFC-2026-034 §2.2: for a governance pull request, the independent Reviewer, Tester and Security/Privacy reviewer complete their checks and the Integration Owner verifies the final state and CI; for a risk-lane pull request, the Security/Privacy reviewer and the Tester; for a fast-lane pull request, one independent Reviewer; for an audit pull request, RFC-2026-034 §2.2's audit lane; for a records-only pull request, RFC-2026-025 §6. Every merge needs green required CI on its exact head. Pushing branch-protection settings or production configuration requires authorized repository/operations ownership and must not be inferred from this guide.

(d) "Temporary manual merge control", second bullet, becomes:

> - Before a merge, the head commit must have a green required CI run and the linked evidence its lane requires under RFC-2026-034 §2.2: Author, independent Reviewer, independent Tester, Security/Privacy and Integration Owner evidence for a governance pull request; Security/Privacy and Tester evidence for a risk-lane pull request; the independent Reviewer's written confirmation for a fast-lane pull request; for a round audit's pull request, what RFC-2026-034 §2.2's audit lane names. The Integration Owner's verdict on risk-lane and fast-lane work follows in the round audit (RFC-2026-034 §2.3).

(e) "Temporary manual merge control", fourth bullet, becomes:

> - The Author never approves, test-verifies, integrates, or authorizes their own work; pressing the merge of a risk-lane or fast-lane pull request after its lane's readers have passed is not integrating it (RFC-2026-034 §2.2). A manual merge cannot waive an unresolved stop-the-line risk.

(f) "Work and evidence flow", second paragraph, first two sentences become (the rest unchanged):

> Use the schemas in `.agents/` for capability profiles, work packages, status updates, and handoffs. Keep canonical evidence under `evidence/<work-package-id>/`, and round-audit evidence under `evidence/audits/` (RFC-2026-034 §2.3); it must contain no secrets or real customer data.

## 8. Owed after the Owner merges

1. The first round audit within seven days, under `evidence/audits/`.
2. **CI prints the tier and the lane on every pull request** (a governance PR: `.github/workflows/ci.yml` is
   WP-0A-A0-004's, the classifier WP-0A-DB-00's). Until then every pull request is H (RFC-2026-030 §9 item 2), so the
   fast lane is closed and only the risk lane's lighter reading applies. The same change lets CI print the audit
   lane, which the classifier today prints as H.
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
  answer to Q-030-5 of 2026-10-08 ((a), the presser is not the Author) and goes beyond its option (b), since it also
  covers tier H outside governance. A0 recommends yes, for speed. The alternative
  keeps Q-030-5 (a): a run other than the Author presses, which needs a second run awake for every merge.
- **Q-034-2. Naming modules.** When RFC-2026-029's layout lands, name in `M_ELIGIBLE_MODULES`, in one governance PR,
  every module that RFC-2026-030 §4.2 item 6 admits (none that owns identity, tenancy, IAM, sessions, secrets, billing,
  entitlement, publishing, connectors, uploads, jobs or provider calls), by name, with `audit-observability-ops` kept off
  the list (A1-251r2-4),
  so ordinary code in them takes the fast lane, **but only after CI runs application tests (§8 item 4)**, so a module's
  own tests run on every fast-lane head (Q0-251-10). A0 recommends yes. The alternative is to name them one by one.
- **Q-034-3. Audit cadence.** Weekly; before each gate; and before the first real customer data and the first
  production deploy that serves users. This replaces your Q-030-2 answer of 2026-10-08 (R0 after 10 merged M or L PRs
  or 7 days, whichever first). A0 recommends this. The alternative keeps that answer: an audit after 10 merged
  risk-lane or fast-lane PRs or 7 days, whichever first, plus the gate and first-data triggers.
- **Q-034-4. The fast lane's reading.** Your chosen option said fast-lane pull requests pass on automatic CI. A0
  recommends keeping **one independent Reviewer** per fast-lane pull request, because the classifier cannot tell
  whether web code is behind a feature flag and has no data path (A1 measured four component diffs, including
  `innerHTML` and an aliased `fetch` POST, that it prints as L), and RFC-2026-030 §2 relies on that written
  confirmation. The alternative is CI only, as your option text said, with the Author recording those confirmations
  and the audit checking them.

- **Q-034-5. The audit pull request.** (a) All four auditors' files are present, each carried with `cherry-pick -x`
  from its auditor's own commit, blob-equal, touching no other path; A0 presses on green CI with no further reader,
  since each file is itself an independent reading. No script checks blob-equality today, so that rests on A0's record
  in the pull request, and the next audit re-checks it. Whether the pull request holds only those files is likewise A0's
  reading, recorded with its `git diff --name-only` against the merge base (A1-251r4-3). This departs from the full path a non-records pull request
  takes and from RFC-2026-002 item 1 ("unreviewed change"), for audit pull requests only. A0 recommends (a). (b) One
  more independent run, not one of the auditors, reads the audit pull request before A0 presses it. In either option
  A0 presses the audit pull request; Q-034-1 does not reach it (C0-251r4-2).
- **Q-034-6. Who presses the governance PRs that open the lanes.** §8 items 2, 4 and 5 are governance PRs (CI prints
  the tier; CI runs application tests; the module names). Your direction of 2026-10-08 (§10.2 of that day's
  disposition, `ให้ A0 กดทุกตัวในแผน (Recommended)`) lets A0 press every governance PR in the plan approved that day once
  four roles pass and CI is green. This RFC does not decide whether these three are in that plan (R0-251-24,
  A1-251r4-3). A0 recommends that A0 may press them under the same conditions, four roles and green CI, so the fast
  lane opens without waiting for you. The alternative: you press each of them personally.

## 10. Order before the merge

1. The Owner answers Q-034-1 to Q-034-6 himself, in chat; no broad delegation answers them.
2. A0, in one commit: transcribes his answers with transcript times into the disposition; amends §2, §3, §4 and §7 to
   match any alternative he chose; sets the status line to Approved.
3. C0, A1, Q0 and R0 re-read that commit on the final head.
4. The head contains current `main`; CI is green on it; the Owner merges it personally with `--match-head-commit`.

## 11. Rollback

A reviewed governance PR that reverts this RFC and the six `CONTRIBUTING_AGENTS.md` passages restores RFC-2026-030's
review depth and the earlier gate text. Work merged under the risk or fast lane stays; the next audit covers it.
