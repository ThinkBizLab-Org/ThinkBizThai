# RFC-2026-001 — Bootstrap tooling contract

Status: In review — local implementation authorized by delegated Product Owner
Decision needed by: G0 / `OPEN-018`
Owner: A0 Atlas (Architecture/Integration)
Execution basis: Product Owner delegated execution on 2026-08-30; independent technical review, security review, test, integration, and CI evidence are required before approval and merge

## Problem

Sprint 0A requires deterministic, version-pinned commands that run consistently for every agent and CI. REP-00 currently has a role-separation validator, but it depends on locally installed command-line tooling. That is insufficient under Decision Register §9.6 while `OPEN-018` is unresolved.

## Scope

This RFC decides only the reproducible bootstrap toolchain for protocol validation, repository scripts, and CI. It does not select production credentials, a database provider, a queue, an application feature, or a payment flow.

## Options

1. **Node LTS + bundled npm.** Pin one Node distribution and use only its bundled npm; validators use Node standard library with no global package manager.
2. **Containerized toolchain.** Provide a pinned development/CI image containing the runtime and validation tools.
3. **Existing organization standard.** Adopt an already approved ThinkBizLab runtime/toolchain, recorded with exact versions and CI image digest.

## Proposed evaluation criteria

- Exact versions are declared and reproducible locally and in CI.
- The validator can run without production credentials or network access.
- Toolchain supports the approved Phase 1 stack without introducing a second package manager.
- Dependency scanning, lockfile integrity, and future migration/contract tests can use the same CI environment.
- Rollback is a documented config reversal and does not require data migration.

## Decision

Approve option 1 for the bootstrap:

- Node.js `24.20.0` LTS; `.node-version`, `package.json#engines`, and CI must match exactly.
- npm `11.19.0`, supplied by the pinned Node.js distribution. `packageManager` is `npm@11.19.0`.
- npm is bootstrap/package manager only. Do not add pnpm, yarn, Bun, a second lockfile, or global package install to repository or CI.
- Protocol validators use Node standard library only. They must not require `jq`, Python, network, credentials, or project dependencies.
- CI uses `actions/checkout@11d5960a326750d5838078e36cf38b85af677262` with `persist-credentials: false` and `actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020`, runs on `ubuntu-24.04`, installs Node `24.20.0`, and invokes only `npm ci --ignore-scripts` plus repository scripts. Workflow permissions are read-only; no checkout credential may persist into repository command execution.

Node distribution integrity sources (retrieved from Node.js official release archive):

- Linux x64 tarball SHA-256: `2f2c0da162318f0de47665410c7c8c2ed3d36c8f3105de4bbc61176c70a7cbf2`
- Linux arm64 tarball SHA-256: `5f4ddab610c1ab2016b3c227cebdbf6d9495161487e4739c7b90090595f465f7`
- macOS arm64 tarball SHA-256: `40e5607e5ecb3db9192723776da2d75d966260fc74a7a9e731c1bd67dda96bc8`

The initial networked acquisition of the verified Node distribution is allowed only in declared local/CI bootstrap. Once dependencies are installed, test commands must run offline with no credentials. `npm ci --ignore-scripts` is the reproducible clean-machine command; npm version and Node version are asserted before tests run.

Rollback is reverting the bootstrap configuration commit and returning to the prior documentation-only state; no schema, customer data, external provider, or production setting is changed.

## Required evidence before merge

- Clean-machine `npm ci --ignore-scripts` and protocol-validator replay.
- CI job output with no secret injection.
- Security/dependency scan plan and rollback procedure.
- Compatibility confirmation against the approved application-stack decision.
