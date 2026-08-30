# First integration slice fixture plan

Source of truth: [Decision Register §11](../docs/sprint-0a/sprint-0a-decision-register-contract-catalog-th.md) and [Execution Master Plan §8](../docs/plans/ai-content-os-execution-master-plan-th.md).

The first offline, synthetic-only integration fixture must cover this sequence:

`select Business → select Suggestion fixture → Fake AI generates Content → attach Asset fixture → submit for review → schedule → Fake Publish → Notification`

Required assertions are tenant/business/page isolation, immutable version pinning, no duplicate side effect on retry/replay, per-channel partial result, Thai mobile error action, and complete usage/cost/audit/correlation trace. Contract owners must freeze the declared fixture inputs before any consumer implementation uses it. This file is a fixture-plan pointer, not a domain contract or test implementation.
