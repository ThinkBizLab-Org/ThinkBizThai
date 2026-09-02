# A6 Relay — operations, billing, and provider-boundary review

**Work package:** `WP-0A-A0-001`
**Reviewer run:** `/root/a6_relay`
**Review scope:** Read-only/dry-run assessment of the repository bootstrap at `899c2bb`; no code, provider, credential, billing, or publishing change was made.
**Evidence date:** 2026-08-31

## Verdict

**Pass for the narrow bootstrap scope, with external-evidence limitations.** The candidate has appropriate repository-level guardrails for a credential-free bootstrap. This is **not** an A6 approval of a Stripe/Meta integration, payment entitlement, publishing behavior, production release readiness, or Gate G0.

## Findings

1. **Secret and CI boundary — pass within scope.** `.github/workflows/ci.yml` uses read-only `contents` permission, pins checkout/setup actions, disables persisted checkout credentials, and runs `npm ci --ignore-scripts` before repository validation. `scripts/scan-repository-secrets.mjs` is a Node-standard-library, no-credential scanner; the pinned Node 24.20.0 replay passed `npm run check` (14/14 tests) and direct secret scan.
2. **Secret scanning limitation — accepted only as a supplemental bootstrap control.** The scanner deliberately detects a small documented set of common key patterns. It is not a secret manager, provider-token validation service, historical Git scan, dependency/SBOM scan, or substitute for platform controls. No secret, customer data, or provider credential is present in the reviewed scope.
3. **Stripe boundary — no implementation to approve.** The package does not introduce Checkout, redirect handling, webhook processing, entitlement projection, reconciliation, or credentials. The bootstrap guide preserves the required rule that only a verified signed Stripe webhook may establish entitlement; a redirect is not evidence. Actual signature, duplicate/out-of-order/replay, ledger, and reconciliation testing remains for the designated billing package and sandbox evidence.
4. **Meta/publish boundary — no implementation to approve.** The package contains no OAuth, token handling, provider call, publish operation ledger, retry, or channel-result code. The guide preserves the idempotency and per-channel partial-failure requirement, but this review cannot verify either behavior. A test-app-only Meta feasibility package, redacted evidence, and an external operation ledger/retry plan remain required before real publishing.
5. **Release/G0 boundary — not satisfied by green bootstrap CI.** The manifest remains `in_review`; RFC-2026-001 and `OPEN-018` remain in review. Protected branch/CI configuration requires an authorized administrator. Product Owner approval, cross-vendor dry run, Meta/Stripe external evidence, legal/PDPA/accounting decisions, usability, qualified-domain review, and storage restore/purge evidence remain open per the G0 readiness report.
6. **Independence limitation.** The current manifest assigns `/root/a1_bastion` to both independent reviewer and security-reviewer fields. That run is independent of the Author, but the operating model prefers role diversity for approval-bearing critical work. This bootstrap review does not convert that arrangement into external operational or G0 security approval.

## Commands reviewed/run

```text
PATH=/tmp/thinkbizthai-node24.4QRtjj/node-v24.20.0-darwin-arm64/bin:$PATH npm run check
exit 0 — 14/14 tests passed

PATH=/tmp/thinkbizthai-node24.4QRtjj/node-v24.20.0-darwin-arm64/bin:$PATH node scripts/scan-repository-secrets.mjs
exit 0

git diff --check
exit 0
```

## Required follow-up outside this review

- Assign and execute the dedicated Stripe sandbox package with raw-body signature verification, unique event inbox, replay/out-of-order/duplicate tests, and verified-webhook-only entitlement tests.
- Assign and execute the Meta feasibility package using test accounts only; preserve redacted capability, idempotency, ambiguous-timeout, and partial-result evidence.
- Have the repository administrator record branch-protection/required-CI evidence; obtain the Product Owner and required expert approvals through the documented G0 process.
