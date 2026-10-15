# RFC-2026-002 — Temporary manual merge control

Status: Approved — provisional manual control; native protection/G0 not satisfied. NOTE 2026-10-15: AMENDED 2026-10-11 by [`RFC-2026-034`](RFC-2026-034-fast-lane.md) (fast lane), approved by the Product Owner and in effect from his merge of PR #251 (`8086281b`, 2026-10-11). RFC-2026-034 §3 names the rules of this RFC it amends, verbatim: `RFC-2026-002 Decision item 1 ("merge an undrafted/unreviewed change"), item 2 (the handoff links the independent Reviewer, Tester, conditional reviewers and Integration Owner verdict) and item 3 ("the Author cannot … integrate, or authorize their own work"; "the Product Owner may perform the final manual merge"), and its "Evidence and review" list`; and how, verbatim: `for the risk and fast lanes: "reviewed" means the lane's readers of §2.2; the handoff links those readers and, later, the audit verdict; pressing is not integrating (§2.2); A0 may press (Q-034-1); for an audit pull request, item 1's "reviewed" is met as Q-034-5 answers (R0-251-30). Items 4 and 5 unchanged (Q0-251-11)`. This note changes no rule text below; it records the amendment RFC-2026-034 §8 item 3 asks this RFC's owner to note.
Decision needed by: G0 protected-CI evidence
Owner: A0 Architecture/Integration + Product Owner
Decision evidence: Product Owner directed that repository control be written as a manual rule instead of paying for a GitHub plan; repository remains private.

## Problem

Native branch protection/rulesets are unavailable for this private repository on
the current GitHub plan. The Product Owner has directed that no paid GitHub plan
or repository-visibility change be used as the workaround. The repository still
needs a documented control for every merge while that external constraint remains.

## Decision

Until a supported native protected-branch configuration is independently recorded,
every merge into `main` must follow this manual control:

1. **Branch and Draft PR only.** Do not push directly to `main`, force-push it,
   delete it, or merge an undrafted/unreviewed change. All work begins on a
   non-`main` branch and is visible through a Draft PR.
2. **Required pre-merge evidence.** The PR head SHA must have a green required
   CI run. Its handoff must link the head SHA, CI run, clean-diff result, Author
   self-check, independent Reviewer, independent Tester, required conditional
   reviewer(s), Integration Owner verdict, known limitations, and rollback plan.
3. **Separation remains mandatory.** The Author cannot approve, test-verify,
   integrate, or authorize their own work. The Product Owner may perform the
   final manual merge only after the required independent evidence is present;
   this merge is not a substitute for a missing approval or test.
4. **No safety bypass.** A stop-the-line risk, failing CI, missing handoff,
   unresolved security finding, secret/customer-data exposure, or unmet package
   gate blocks merge. Manual control does not authorize force-push, direct push,
   waived RLS, bypassed webhook verification, or any production action.
5. **Reversible recovery.** Roll back with a reviewed revert commit/PR that
   records the reason and verification. Never rewrite `main` history to roll
   back.

## Evidence and review

For each manual merge, record in the relevant handoff:

- PR URL, target `main`, head SHA, merge commit SHA, and CI run URL;
- links to the independent review, security/privacy review when required, tester,
  and integration evidence; and
- rollback/revert path plus unresolved risks.

The approval evidence for the initial procedure is recorded in
`evidence/WP-0A-A0-001/rfc-002-exact-commit-verification.md`. It covers the
Product Owner approval, independent technical/security review, tester replay,
Integration Owner verification, and green CI for the exact bootstrap commit.
Every future manual merge still requires the per-merge evidence in this RFC;
this decision record is not blanket merge approval.

Bootstrap-only Product/UX evidence is recorded in
`evidence/WP-0A-A0-001/review-product-ux-A5-assigned.md`. It resolves the
conditional Product/UX routing ambiguity for that bootstrap scope only; it does
not approve this RFC, a merge, Gate G0, or later user-facing implementation.

## Explicit limitations

Manual control is procedural, not technical enforcement. It cannot satisfy the
G0 protected-CI/branch-protection requirement, does not grant G0 passage, and
does not change any source-defined package dependency, provider, credential,
legal/PDPA/accounting, or production approval.

## Rollback

Revert this documentation/RFC change through the normal reviewed PR flow. It
creates no persisted data, provider state, credential, or customer-data effect.
