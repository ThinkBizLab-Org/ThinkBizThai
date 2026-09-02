# RFC-2026-002 exact-commit verification

**Recorded:** 2026-08-31

**Decision scope:** Approve RFC-2026-002 only as a provisional manual process
control. This record does not approve a merge, Gate G0, a work-package lifecycle
advance, provider activity, billing, credentials, or production work.

## Immutable evidence target

- **Commit:** `91a8c7384976fca66add199cb80c70d6145d4e74`
- **Draft PR:** `#1`, branch
  `agent/root/WP-0A-A0-001-repository-bootstrap` targeting `main`
- **CI:** GitHub Actions workflow `Bootstrap validation`, run `33359209924`,
  conclusion `success` for that exact commit
- **Working-tree state at audit:** clean

## Approval and independent evidence

- **Product Owner:** approved the temporary rule with the exact statement
  recorded in `rfc-002-product-owner-approval.md`.
- **Independent Reviewer / Security — `/root/a1_bastion`:** approved the exact
  commit as an owner-authorized provisional procedural rule; confirmed that it
  retains `In review` package state before this RFC-status record and does not
  create native protection, G0 passage, or merge authority.
- **Independent Tester — `/root/q0_sentinel`:** replayed
  `PATH="/tmp/thinkbizthai-node24.4QRtjj/node-v24.20.0-darwin-arm64/bin:$PATH" npm_config_offline=true npm run check`
  against the exact commit: exit `0`, 24 passed, 0 failed. It also reported
  `git diff --check 91a8c...^ 91a8c...` exit `0`.
- **Integration Owner — `/root/r0_steward`:** verified the clean exact commit,
  the green CI result, and the pinned Node `24.20.0` / npm `11.19.0` replay;
  approved classification as **Approved — provisional manual control** only.

The role verdicts above are transcribed from the independent reviewers' exact
commit audits without changing their scope or verdicts. They remain independent
from Author `/root`.

## Binding limitations

- This is procedural control only; GitHub does not technically enforce it.
- It does not create native branch protection or satisfy the protected-CI G0
  requirement.
- It is not authorization to merge Draft PR #1. Each merge separately requires
  its exact head SHA, green CI, required independent evidence, known-risk and
  rollback record, stop-the-line clearance, and Product Owner manual decision.
- Direct/force pushes, RLS or payment/webhook bypasses, and waived role
  separation remain prohibited.
- Cross-vendor protocol evidence and every other G0 external verification item
  remain open as recorded in `evidence/g0-tracker-th.md`.

## Recovery

If the temporary rule is superseded or found inadequate, revert its change using
the same reviewed PR procedure and record the reason. Never rewrite `main`
history as recovery.
