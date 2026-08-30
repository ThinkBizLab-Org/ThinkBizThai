# Ownership registry pointer

The authoritative Sprint 0A module, migration-range, shared-file, and protected-path ownership registry is section 4 of [the Decision Register](../docs/sprint-0a/sprint-0a-decision-register-contract-catalog-th.md). This pointer prevents a competing registry from drifting before G0.

Before an implementation package becomes `Ready`, its manifest must declare a narrower writable/read-only/forbidden path scope and its owner must match that canonical registry. Materialize a machine-readable extract here only through an approved RFC/versioned contract change.
