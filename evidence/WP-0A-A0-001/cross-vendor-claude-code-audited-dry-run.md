# Audited external cross-vendor protocol dry run — WP-0A-A0-001

**Classification:** Independently reviewed cross-vendor protocol evidence.
**External participant:** Anthropic Claude Code (`claude-haiku-4-5-20251001`)
**External run identifier:** `anthropic-cli/g0-schema-audit-20260831-01`
**Observed base revision:** `3ecfdcddddba20cdac2d8f1e91c9c69bb2972e93`
**Run mode:** Read-only; no accepted work package and no package role.

## Audit method

The external participant was supplied a fixed Bash allowlist and the same twelve
literal commands in its task packet. Its Claude Code stream audit recorded exactly
these twelve tool calls, in order, and no others:

1. `cat CONTRIBUTING_AGENTS.md`
2. `cat work-packages/WP-0A-A0-001.json`
3. `cat docs/sprint-0a/sprint-0a-decision-register-contract-catalog-th.md`
4. `cat docs/sprint-0a/sprint-0a-multi-agent-engineering-operating-model-th.md`
5. `cat docs/sprint-0a/sprint-0a-g0-readiness-report-th.md`
6. `cat CLAUDE.md`
7. `cat .agents/handoff.schema.json`
8. `cat .agents/work-package.schema.json`
9. `git rev-parse HEAD`
10. `git status --short`
11. `git diff --check`
12. `npm run check`

The external CLI process exited `0`. The stream showed a clean working tree, an
empty `git diff --check`, the base revision above, and successful completion of
the pinned suite: Node `v24.20.0`, npm `11.19.0`, and 24 passing bootstrap tests.
The participant did not invoke a write, Git write, credential, browser, provider,
or production tool. The Claude harness may retain its own local tool-output cache
outside this repository; no repository file or Git state was changed by the run.
The redacted event-level audit trace is
`evidence/WP-0A-A0-001/cross-vendor-claude-code-audited-trace.json`.

## Handoff-format check

The participant's response included explanatory wrapper text plus a fenced JSON
object. The JSON object was extracted without semantic alteration and validated
against `.agents/handoff.schema.json`: all 25 required fields were present,
`protocol_version` was `1.0.0`, required non-empty fields were non-empty, and the
declared array/string types conformed. The canonical extracted handoff is
`handoffs/WP-0A-A0-001-cross-vendor-claude-code-audited-dry-run-handoff.json`.

## Boundaries and remaining decision

This demonstrates a distinct-vendor, pinned-runtime, manifest-to-handoff dry run.
It does **not** grant an Author, Reviewer, Tester, Security, Product/UX,
Integration, Product Owner, merge, native-protection, RFC, or G0 approval. G0 as a
whole remains **Specification Baseline Complete / External Verification Pending**.
Independent Reviewer, Security Reviewer, Tester, and Integration Owner disposition
is recorded in `evidence/WP-0A-A0-001/cross-vendor-claude-code-audited-disposition.md`.
