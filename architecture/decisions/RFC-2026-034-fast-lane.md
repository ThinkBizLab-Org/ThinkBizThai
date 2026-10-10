# RFC-2026-034: fast lane -- application code on Candidate contracts, lighter per-PR review, audits in rounds

Status: **Proposed.** The Product Owner chose the direction on 2026-10-10, answering A0's question at 19:03:54Z (asked
19:02:50Z, session `c2816eec`) with `ทางกลาง (Recommended)`; the question, its options and the answer are transcribed in
`evidence/WP-0A-A0-001/product-owner-disposition-2026-10-11-fast-lane.md`. The text below is A0's drafting of that
direction, revised after the first role round (C0-251-1..11, A1-251-1..10, R0-251-1..9). It is not in effect until the
Order of §10 is complete: the Owner answers §9 himself, A0 records his answers and sets the status to Approved, the
roles re-read, and the Owner merges this PR personally (a governance PR under RFC-2026-025 §5 item 6).
Date: 2026-10-11
Author: `/claude/a0_atlas` (A0), as an increment of `WP-0A-A0-001`, which owns `CONTRIBUTING_AGENTS.md`
Owner: the Product Owner
Protocol version: `1.0.0`
Amends, once Approved and merged (each named in §3): `CONTRIBUTING_AGENTS.md` (four passages, §7); RFC-2026-030 §3 and
§3.1–§3.2; RFC-2026-025 §5 and §6.4 as they require four roles on each pull request; RFC-2026-002's per-merge evidence
clause; RFC-2026-031 §3.3 (the "Consumers" bullet); Decision Register line 373, §5.1 lines 190–191 and the 2026-10-08
disposition §10.3, as to writing and merging application code only.

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
   binds until the thirteen First-Slice contracts are `Frozen` and a PR amends the gate text (RFC-2026-031 §3.3, §6).
   All thirteen are `Candidate`; none is `Frozen`. So no application code can be written.
2. **Review depth.** Under RFC-2026-030, every module not on the reviewed module allowlist (today every module) is tier
   H, and tier H is read by every role on every pull request.

## 2. The decision

### 2.1 Application code on `Candidate` contracts, still reversible and synthetic

Before the G0 exit closes, agents may write application code, fakes and consumer tests against contracts at
`Candidate` or above, **as reversible work**:

- **Synthetic data only.** No real customer data until the PDPA work passes (D0 of the plan approved 2026-10-08).
- **No production schema.** Migrations run on local and staging databases only; nothing is applied to a production
  project.
- **No live external provider.** No production credential, no send to a real third party, no live provider account
  bound; providers are faked or sandboxed.

This narrows the gate; it does not remove it. It replaces only the list "spikes, prototypes, fixtures, fake adapters,
contract tests" with application code, under the same reversibility the gate already required.

Unchanged:

- **The G0 exit.** It stays "decided, conditional" and closes only as RFC-2026-031 §6 says: all thirteen First-Slice
  contracts `Frozen`, and a later PR that amends the gate text to say the exit has closed. This RFC is not that PR.
- **`Frozen` before production use.** Before any paid beta, real customer data, or production deploy that serves users,
  every contract that deploy uses is `Frozen` under RFC-2026-031 (not only the First Slice; A1-251-5).
- A breaking change to a `Candidate` contract follows its owner and the RFC path, as today.

### 2.2 Four lanes, decided by the base's classifier, failing closed

The lane follows RFC-2026-030's tier, printed by the **base's copy** of `scripts/db/classify-review-tier.mjs` and never
lowered by hand. Anything the classifier cannot place is tier H. Nothing about the classifier changes here.

| Lane | What it covers | Before merge | Integration Owner (R0) | Who presses |
|---|---|---|---|---|
| **Governance** | RFCs, `CONTRIBUTING_AGENTS.md`, gate rules, CI workflow, either classifier, the integrity guard's own code (RFC-2026-025 §5 item 6) | as today: every role, then the Owner | as today, per PR | the Owner personally, or A0 where the Owner names the PR |
| **Records** | RFC-2026-025 §6.1 | as today: one independent reading (§6.2) | as §6.2 says | as §6 says |
| **Risk** | every other tier-H pull request: migrations, RLS, grants, schema; auth, sessions, identity, tenancy, roles; secrets, OAuth, credentials; billing, payments, webhooks; publishing, jobs, queues, storage and deletion, provider adapters, mail and notifications; contracts; scripts and test kits; any module not on the allowlist; anything unplaced | **A1 (Security/Privacy) and Q0 (Tester)** each pass on the final head; a stop-the-line or security finding adds C0 and R0 at once (RFC-2026-030 §6) | in the round audit (§2.3) | A0, under the standing delegation (Q-034-1) |
| **Fast** | tier M and L only (RFC-2026-030 §3, §4) | **green CI only** | in the round audit (§2.3) | A0, including its own pull requests (Q-034-1) |

- A pull request never drops lane during its life; a security finding raises it to the risk lane and to tier H's full
  reading for that PR.
- **Today the fast lane is empty.** Every module is H until a governance PR names it in `M_ELIGIBLE_MODULES`
  (RFC-2026-030 §4.2 item 6). So until modules are named, application code takes the risk lane: two readers instead of
  four. Q-034-2 asks the Owner whether to name each First-Slice module as soon as RFC-2026-029's layout lands, which is
  what moves ordinary application code into the fast lane. Once a module is named, the classifier's H signals inside it
  (service-role access, environment and secret reads, injection sinks, removed guards) still raise a PR to H, so a
  database client using the service-role key cannot reach the fast lane (A1-251-2).
- **Tests and the integrity manifest.** A pull request that only adds tests changes `test-kits/integrity-manifest.json`
  by regeneration, which the classifier reads as H, so it is a risk-lane PR. That is accepted here; §8 item 4 owes a CI
  change so application tests can run without that cost.

### 2.3 Audits in rounds

- **When.** Once a week, before each gate (G1 exit, G2 exit, paid beta), and before the first real customer data and
  the first production deploy that serves users, whichever comes first (Q-034-3).
- **Who.** C0, A1, Q0 and R0, each a run other than the Author's, read the cumulative diff on `main` since the last
  audit, every PR's tier output, and CI on `main`. Each writes its file under `evidence/audits/<date>/`, a path this PR
  gives to `WP-0A-A0-001`.
- **What they decide.** R0's audit verdict is the Integration Owner's verdict for risk-lane and fast-lane work it
  covers; a work package moves past `in_review` only on it. Findings become fix PRs, each laned on its own; a lane
  error is itself a finding. A stop-the-line finding stops the line at once.

### 2.4 What does not change

- The non-negotiable security and data rules of `CONTRIBUTING_AGENTS.md`, word for word.
- No direct push to `main`; every change through a pull request, a true merge commit pinned with
  `--match-head-commit`, green CI on that head, the head containing current `main`.
- Separate roles exist and are held by runs other than the Author's; the Author never writes another role's verdict.
- Ownership, `writable_paths`, amendment declarations, `verify-branch-scope`, and the classifier itself.
- Governance and records pull requests, and who presses them.

## 3. What it amends, exactly

| Rule | Amended how |
|---|---|
| `CONTRIBUTING_AGENTS.md` "Current gate constraint" | §7 (a): the work list widened to application code on Candidate contracts, under the same reversibility |
| `CONTRIBUTING_AGENTS.md` "Separation of duties" ¶1 | §7 (b): lanes instead of tiers for how many roles read each PR |
| `CONTRIBUTING_AGENTS.md` "Verification and handoff" ¶2 | §7 (c): who checks before merge, by lane |
| `CONTRIBUTING_AGENTS.md` "Temporary manual merge control", bullet 2 | §7 (d): the linked evidence, by lane |
| RFC-2026-030 §3 table, "Per-PR review" and "Integration Owner" columns | tier H outside governance: A1 + Q0 per PR, R0 in the audit; M and L: green CI per PR, all four in the audit |
| RFC-2026-030 §3.1, "Who presses the merge" | A0 may press M and L PRs of a package it authored (Q-034-1) |
| RFC-2026-030 §3.2 | the end-of-package R0 verdict becomes the round audit (§2.3) |
| RFC-2026-025 §5 and §6.4, as they require C0, A1, Q0 and R0 on each pull request under the standing delegation | for risk and fast lanes only, as §2.2 says; §5 item 6 and §6.1–§6.3 unchanged |
| RFC-2026-002, "linked Author, independent Reviewer, independent Tester, Security/Privacy, Integration Owner evidence" before merge | for risk and fast lanes, the evidence §2.2 names |
| RFC-2026-031 §3.3 "Consumers"; Decision Register line 373; 2026-10-08 disposition §10.3 | as to writing application code only, §2.1; RFC-2026-031 §6 (what closes the G0 exit) unchanged |
| Decision Register §5.1 (lines 190–191: implementation against `Frozen v1`, consumer merge at `Integrated v1`) | as to application code against `Candidate` contracts merging to `main` under §2.1 before the producer is `Frozen` or `Integrated`; production use still needs `Frozen` (§2.1) (Q0-251-4) |

## 4. Risks, stated

- **Late discovery.** A fast-lane or risk-lane defect may live up to a week before R0 reads it. Mitigation: risk-lane
  PRs are read by A1 and Q0 before merge; CI runs on every head; the audit precedes every gate and first real data.
- **Self-merge.** The Author presses its own fast-lane work. Mitigation: the fast lane is only tier M and L, which the
  classifier fails closed into; the audit.
- **Empty fast lane.** Until modules are named (Q-034-2), most of the speed comes from two readers instead of four, not
  from the fast lane.

## 5. Effect on RFC-2026-031

Its freeze rule, freeze review and declared-gap policy stand, and they now gate production use (§2.1) as well as the G0
exit. Its §6 is unchanged.

## 6. Effect on running work

Pull requests opened before the merge finish under the rules they started under, unless their author re-runs the
classifier on a current base and the roles agree the lighter lane.

## 7. The `CONTRIBUTING_AGENTS.md` passages it amends (applied on this PR)

(a) "Current gate constraint" becomes:

> Sprint 0A is **Specification Baseline Complete / External Verification Pending**; the G0 exit is decided and conditional, and closes only as [`RFC-2026-031`](architecture/decisions/RFC-2026-031-first-slice-contract-freeze.md) §6 says. Until then agents may build application code, fakes, consumer tests, fixtures, spikes and prototypes against contracts at `Candidate` or above (RFC-2026-034 §2.1), as reversible work only: synthetic data, migrations on local and staging databases only and never on a production project, and no live external provider account, credential or send. Every contract a deploy uses is `Frozen` (RFC-2026-031) before any paid beta, real customer data, or production deploy that serves users. Do not represent a package as `Ready`, `Integrated`, `Verified`, or `Done` without the evidence and independent roles required by the package.

(b) "Separation of duties", first paragraph, becomes:

> Every implementation package has distinct Author, Independent Reviewer, Independent Tester, and Integration Owner, and no role is ever held by the Author's run. When they read each pull request follows its lane under [`RFC-2026-034`](architecture/decisions/RFC-2026-034-fast-lane.md) §2.2, which keeps the tiers of [`RFC-2026-030`](architecture/decisions/RFC-2026-030-risk-tiered-review.md), decided by the base's copy of `scripts/db/classify-review-tier.mjs` and never lowered by hand: governance pull requests (RFCs, this guide, gate rules, CI, the classifiers, the integrity guard) are read by every role and merged by the Product Owner under RFC-2026-025 §5; records-only pull requests follow RFC-2026-025 §6; every other tier H pull request (migrations and RLS, auth and tenancy, secrets and OAuth, billing, publishing, jobs and provider adapters, contracts, scripts and test kits, every module not on the reviewed module allowlist, and anything the classifier cannot place) is read by the Security/Privacy reviewer and the Tester on its final head before merge; tier M and L pull requests merge on green CI. The Reviewer, Tester, Security/Privacy reviewer and Integration Owner read all merged risk-lane and fast-lane work in the round audits of RFC-2026-034 §2.3, and the Integration Owner's audit verdict is what moves a package past `in_review`. A stop-the-line or security finding raises any pull request to tier H and its full reading. The Author may move work only through `in_review`; an Author must never approve, test-verify, integrate, or gate-approve their own work. Critical work additionally requires the appropriate independent Security/Privacy, Product/UX, Domain, or SRE reviewer.

(c) "Verification and handoff", second paragraph, becomes:

> Before any commit or push, the Author must provide a clean diff and self-test evidence. What must pass before a merge follows the lane of RFC-2026-034 §2.2: for a governance pull request, the independent Reviewer, Tester and Security/Privacy reviewer complete their checks and the Integration Owner verifies the final state and CI; for a risk-lane pull request, the Security/Privacy reviewer and the Tester; for a fast-lane pull request, green CI; for a records-only pull request, RFC-2026-025 §6. Every merge needs green required CI on its exact head. Pushing branch-protection settings or production configuration requires authorized repository/operations ownership and must not be inferred from this guide.

(d) "Temporary manual merge control", second bullet, becomes:

> - Before a merge, the head commit must have a green required CI run and the linked evidence its lane requires under RFC-2026-034 §2.2: Author, independent Reviewer, independent Tester, Security/Privacy and Integration Owner evidence for a governance pull request; Security/Privacy and Tester evidence for a risk-lane pull request; none beyond CI for a fast-lane pull request, whose roles read it in the round audit (RFC-2026-034 §2.3).

## 8. Owed after the Owner merges

1. The first round audit within seven days, under `evidence/audits/` (owned by `WP-0A-A0-001` from this PR).
2. **The classifier prints the lane** (WP-0A-DB-00 owns `scripts/db/classify-review-tier.mjs`; a governance PR): its
   header comments and the line that names RFC-2026-030 as the only rule.
3. Status-line notes that RFC-2026-034 amends them: RFC-2026-002, RFC-2026-025, RFC-2026-030, RFC-2026-031, each by its
   owner; a note on Decision Register line 373 by the register's owner; WP-0A-A0-010 `open_blockers[1]` and the G0
   tracker's G0-024.
4. **CI runs application tests** (a governance PR, WP-0A-A0-004's `ci.yml`), so tests of application code do not each
   force a risk-lane PR through the integrity manifest.
5. When RFC-2026-029's layout lands, the governance PR that names modules in `M_ELIGIBLE_MODULES`, as Q-034-2 is
   answered.

## 9. Questions for the Owner

- **Q-034-1. Who presses.** Risk-lane PRs merge after A1 and Q0 pass, and fast-lane PRs on green CI; in both, A0 presses,
  including pull requests A0 authored, and R0 reads them in the audit, not before the merge. A0 recommends yes. The
  alternative is that a run other than A0 presses them, which keeps the old separation but needs a second run for every
  merge.
- **Q-034-2. Naming modules.** When RFC-2026-029's layout lands, name each First-Slice module in `M_ELIGIBLE_MODULES` in
  one governance PR, so that ordinary code in them takes the fast lane (H signals inside them still raise a PR). A0
  recommends yes. The alternative is to name modules one by one as each is reviewed, which keeps more code in the risk
  lane for longer.
- **Q-034-3. Audit cadence.** Weekly; before each gate; and before the first real customer data and the first production
  deploy that serves users. A0 recommends this. The alternative is every 10 merged risk-lane or fast-lane PRs.

## 10. Order before the merge

1. The Owner answers Q-034-1 to Q-034-3 himself, in chat; no broad delegation answers them.
2. A0 transcribes his answers (with transcript times) into the disposition, amends §2.2, §2.3 and §7 to match any
   alternative he chose, and sets the status to Approved, in one commit.
3. C0, A1, Q0 and R0 re-read that commit on the final head.
4. The head contains current `main`; CI is green on it; the Owner merges it personally with `--match-head-commit`.

## 11. Rollback

A reviewed governance PR that reverts this RFC and the four `CONTRIBUTING_AGENTS.md` passages restores RFC-2026-030's
review depth and the earlier gate text. Work merged under the fast or risk lane stays; the next audit covers it.
