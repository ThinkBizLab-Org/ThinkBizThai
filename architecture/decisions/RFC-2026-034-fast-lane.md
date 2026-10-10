# RFC-2026-034: fast lane -- build on Candidate contracts, merge ordinary work on green CI, audit in rounds

Status: **Proposed.** The Product Owner chose the direction on 2026-10-10, answering A0's question at 19:03:54Z (asked
19:02:50Z, session `c2816eec`) with `ทางกลาง (Recommended)`; the question, its options and the answer are transcribed in
`evidence/WP-0A-A0-001/product-owner-disposition-2026-10-11-fast-lane.md`. The text below is A0's drafting of that
direction. It is not in effect until the Owner merges this PR personally (a governance PR under RFC-2026-025 §5 item 6:
it changes `CONTRIBUTING_AGENTS.md`, a gate rule and the review rule), and §9's questions are his to answer.
Date: 2026-10-11
Author: `/claude/a0_atlas` (A0), as an increment of `WP-0A-A0-001`, which owns `CONTRIBUTING_AGENTS.md`
Owner: the Product Owner
Protocol version: `1.0.0`
Amends: `CONTRIBUTING_AGENTS.md` "Current gate constraint" and "Separation of duties"; RFC-2026-030 §3 for every PR the
fast lane covers; RFC-2026-031 where it ties writing implementation to `Frozen v1`.

---

## 1. Why

From 2026-10-09 to 10-11 every pull request, records included, was read by four roles on its final head before A0
pressed it, as the Owner directed for that session. Six PRs took a night. The Owner asked at 19:02:26Z whether the rule
could be dropped, development sped up, and the audit done once. A0 answered that a single audit at the end is cheap for
presentation and ordinary logic but expensive for tenant isolation, auth, secrets and payment, where a defect found
late means a leak or a wrong charge and an integrated migration can only be forward-fixed. The Owner chose the middle
course A0 recommended.

Two things slow the work:

1. **The gate.** `CONTRIBUTING_AGENTS.md` "Current gate constraint" and Decision Register §5.1 / §7.2 item 2 allow
   implementation only on `Frozen v1` contracts. All fourteen First-Slice contracts are `Candidate`; none is `Frozen`,
   so no application code can be written.
2. **Review depth.** RFC-2026-030's classifier puts every module not on the reviewed allowlist (today every module),
   every contract, script and test kit, in tier H, which every role reads on every PR.

## 2. The decision

### 2.1 Application code may be written against `Candidate` contracts

Implementation, fakes and consumer tests may be built against any contract at `Candidate` or above. This RFC outranks
the Decision Register lines that tie implementation to `Frozen v1` for this purpose (`CONTRIBUTING_AGENTS.md`
"Authority and required reading", item 1).

Still required, unchanged:

- **No real customer data** before the PDPA work passes (D0 of the G1/G2 plan approved 2026-10-08). Synthetic data only.
- **`Frozen v1` before production use**: before any paid beta, real customer data, or a production deploy that serves
  users, every First-Slice contract the deploy uses is `Frozen` under RFC-2026-031.
- A breaking change to a `Candidate` contract follows the contract's owner and its RFC path, as today.

### 2.2 Two lanes, decided by the paths a PR changes

| Lane | What it covers | Before merge | Who presses |
|---|---|---|---|
| **Risk lane** | migrations, RLS, grants, schema; auth, sessions, identity, tenancy, roles; secrets, OAuth, tokens, credentials; billing, payments, subscriptions, entitlement, webhooks; publishing and other external side effects; CI, guards, the integrity manifest, either classifier | green CI, **A1 (Security/Privacy) and Q0 (Tester)** each pass on the final head | A0, on the standing delegation (RFC-2026-025 §5) |
| **Governance** | RFCs, `CONTRIBUTING_AGENTS.md`, gate rules, the review rule itself | as today (RFC-2026-025 §5 item 6): the Owner merges personally unless he names the PR | the Owner, or A0 where he names it |
| **Fast lane** | everything else: application modules and UI, tests, fixtures, fakes, contract text that does not change a rule, docs, records-only PRs | **green CI only** (the full suite, the secret scan, the coverage floor and the integrity guard) | A0, including on its own PRs |

- A PR touching any risk-lane path is a risk-lane PR. A PR never drops lane during its life.
- A stop-the-line or security finding raises any PR to the risk lane at once (RFC-2026-030 §6, unchanged).
- Until the classifier prints the lane (§8 item 2), A0 records the lane in the PR body with the paths that decide it,
  and the audit (§2.3) checks every PR's lane.

### 2.3 Audits in rounds

- **When.** Once a week, and before each gate (G1 exit, G2 exit, paid beta), whichever comes first.
- **Who.** C0, A1, Q0 and R0, each independent of A0, read the cumulative diff on `main` since the last audit's head,
  every PR's lane record, and CI on `main`. Each writes its file under `evidence/audits/<date>/`.
- **What they can do.** Findings become fix PRs, each laned on its own. A finding that a fast-lane PR should have been
  risk-lane is itself a finding. Stop-the-line findings stop the line at once, as today.
- **Status moves.** A work package moves past `in_review` only on an audit that covers its merged work; the audit is the
  independent review, test and integration verdict for fast-lane work (`CONTRIBUTING_AGENTS.md` keeps the roles; this
  changes when they read).

### 2.4 What does not change

- The non-negotiable security and data rules of `CONTRIBUTING_AGENTS.md`, word for word.
- No direct push to `main`; every change through a pull request, a true merge commit pinned with
  `--match-head-commit`, green CI on that head, the head containing current `main`.
- Separate roles exist and are held by runs other than the Author's; the Author never writes another role's verdict.
- Ownership, `writable_paths`, amendment declarations and `verify-branch-scope`.

## 3. The Author pressing its own fast-lane PRs

RFC-2026-030 §3.1 forbids the Author pressing M or L PRs because no Integration Owner reads them first. The fast lane
accepts that, by the Owner's choice of speed, for fast-lane paths only, with the round audit as the compensating
control. It is the single largest reduction in this RFC, and §9 Q-034-1 puts it to the Owner explicitly.

## 4. Effect on RFC-2026-030

RFC-2026-030's classifier and its tier H list remain the input; §2.2 groups them into lanes. Tier M and L PRs, and tier
H PRs whose only H reasons are "a module not on the allowlist", "contracts" (text that moves no rule), "scripts" or
"test kits" outside the risk-lane list, become fast-lane PRs. RFC-2026-030 §3.2 (R0 at the end of the work package) is
replaced by §2.3's audit.

## 5. Effect on RFC-2026-031

RFC-2026-031's freeze rule, review and declared-gap policy stand; they now gate production use (§2.1), not writing
code.

## 6. Risks, stated

- **Late discovery.** A fast-lane defect may live up to a week on `main`. Mitigation: the risk lane covers every class
  where late discovery is expensive; CI runs the full suite on every head.
- **Lane misclassification.** Until the classifier prints the lane, a person decides it. Mitigation: the audit reads
  every lane record; misclassification is a finding.
- **Self-merge.** The Author presses its own fast-lane work. Mitigation: the audit; the Owner can withdraw the fast lane
  by reverting this RFC (§10).

## 7. The `CONTRIBUTING_AGENTS.md` passages it amends (applied on this PR)

"Current gate constraint" becomes:

> Application code, fakes and consumer tests may be built against contracts at `Candidate` or above (RFC-2026-034 §2.1). Synthetic data only until the PDPA work passes; every First-Slice contract a deploy uses is `Frozen v1` (RFC-2026-031) before any paid beta, real customer data, or production deploy that serves users. Do not represent a package as `Ready`, `Integrated`, `Verified`, or `Done` without the evidence and independent roles required by the package.

"Separation of duties", first paragraph, becomes:

> Every implementation package has distinct Author, Independent Reviewer, Independent Tester, and Integration Owner, and no role is ever held by the Author's run. When they read follows the lane of each pull request under [`RFC-2026-034`](architecture/decisions/RFC-2026-034-fast-lane.md), which groups the tiers of [`RFC-2026-030`](architecture/decisions/RFC-2026-030-risk-tiered-review.md): risk-lane pull requests (migrations and RLS, auth and tenancy, secrets and OAuth, billing and payments, publishing and external side effects, CI and guards) are read by the Security/Privacy reviewer and the Tester on the final head before merge; governance pull requests follow RFC-2026-025 §5; fast-lane pull requests merge on green CI, and the Reviewer, Tester, Security/Privacy reviewer and Integration Owner read them in the round audits of RFC-2026-034 §2.3. A stop-the-line or security finding raises any pull request to the risk lane. The Author may move work only through `in_review`; a package moves past `in_review` only on an audit or review that covers its merged work; an Author must never approve, test-verify, integrate, or gate-approve their own work. Critical work additionally requires the appropriate independent Security/Privacy, Product/UX, Domain, or SRE reviewer.

## 8. Owed after the Owner merges

1. The first round audit within seven days of the merge, and its directory `evidence/audits/`.
2. A classifier change (WP-0A-A0-004, risk lane) that prints the lane of every PR, so the lane is not only something A0
   reports.
3. RFC-2026-030 and RFC-2026-031: a status-line note that RFC-2026-034 amends them, in the next governance PR of their
   owners.

## 9. Questions for the Owner

- **Q-034-1.** Fast-lane PRs merge on green CI and A0 presses them, including its own (§3). A0 recommends yes; the
  alternative is that a run other than A0 presses them, which keeps the old separation but needs a second run awake for
  every merge.
- **Q-034-2.** Audit cadence: weekly and before each gate (§2.3). A0 recommends this; the alternative is every 10 merged
  fast-lane PRs.
- **Q-034-3.** CI, guards, the integrity manifest and the classifiers are in the risk lane (§2.2). A0 recommends yes,
  because weakening a guard hides every other defect; the alternative puts them in the fast lane.

## 10. Rollback

A reviewed PR that reverts this RFC and the two `CONTRIBUTING_AGENTS.md` passages restores RFC-2026-030's tiers and the
earlier gate text. Work merged under the fast lane stays; the next audit covers it.
