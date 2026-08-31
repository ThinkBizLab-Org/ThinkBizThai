# RFC-2026-002 — Temporary manual merge control

Status: In review — temporary procedure authorized by Product Owner
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

This RFC requires independent technical review, security review, tester replay,
Integration Owner verification, and CI before it may be treated as an integrated
repository procedure.

## Explicit limitations

Manual control is procedural, not technical enforcement. It cannot satisfy the
G0 protected-CI/branch-protection requirement, does not grant G0 passage, and
does not change any source-defined package dependency, provider, credential,
legal/PDPA/accounting, or production approval.

## Rollback

Revert this documentation/RFC change through the normal reviewed PR flow. It
creates no persisted data, provider state, credential, or customer-data effect.
