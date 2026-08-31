# WP-0A-A0-002 — Independent Security/Privacy review

Reviewer run: `/claude/a1_bastion` (Anthropic, `claude-opus-5`)
Role: independent Security/Privacy reviewer — skill profile `security-privacy`
Head commit under review: `1873ade0252608be870b6b617515b00d0ae405a2`
Branch: `agent/claude/WP-0A-A0-002-contract-test-coverage`
Base revision of the change: `dcafcf8`
Date: 2026-08-31

## Scope and authority of this record

This is Security/Privacy evidence only. It is **not** Reviewer (contract/architecture)
approval, **not** Tester verification, **not** Integration Owner verification, **not**
Product Owner disposition, **not** merge authorization, and **not** Gate G0 approval.
It does not advance the package status, does not approve RFC-2026-003, and does not
waive any control in `CONTRIBUTING_AGENTS.md` or RFC-2026-002.

This run did not author any part of the change. The Author is `/claude/a0_atlas`
(`.agents/capability-profiles/cc-a0-atlas.json`). This run is also distinct from the
OpenAI Codex run `/root/a1_bastion` declared separately in the same directory. This
run's own declaration is `.agents/capability-profiles/cc-a1-bastion.json`.

## Toolchain used

All commands were executed through a login shell so the pinned toolchain resolved.

| Command | Exit | Observed output |
|---|---|---|
| `zsh -lc 'node --version'` | `0` | `v24.20.0` |
| `zsh -lc 'npm --version'` | `0` | `11.19.0` |

## Commands run

All commands run from `/Users/bank/ThinkBizThai` unless a path argument says otherwise.

| # | Command | Exit | Observed output |
|---|---|---|---|
| 1 | `node scripts/scan-repository-secrets.mjs` | `0` | no output |
| 2 | `npm run check` | `0` | `ℹ tests 32 / ℹ suites 0 / ℹ pass 32 / ℹ fail 0 / ℹ cancelled 0 / ℹ skipped 0 / ℹ todo 0` |
| 3 | `node scripts/validate-work-package-ownership.mjs work-packages` | `0` | no output |
| 4 | `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-A0-002.json` | `0` | no output |
| 5 | `node scripts/validate-capability-profiles.mjs` | `0` | no output |
| 6 | `node scripts/validate-work-packages.mjs` | `0` | no output |
| 7 | `node --test test-kits/contracts/*.test.mjs` | `0` | `ℹ tests 6 / ℹ pass 6 / ℹ fail 0` |
| 8 | `zsh -lc 'node --test test-kits/*.test.mjs'` (previous glob) | `0` | `ℹ tests 26 / ℹ pass 26 / ℹ fail 0` |
| 9 | `sh -c "node --test test-kits/*.test.mjs"` (previous glob, POSIX shell) | `0` | `ℹ tests 26 / ℹ pass 26 / ℹ fail 0` |
| 10 | `sh -c "node --test 'test-kits/**/*.test.mjs'"` (new value, POSIX shell) | `0` | `ℹ tests 32 / ℹ pass 32 / ℹ fail 0` |
| 11 | `bash -c "node --test 'test-kits/**/*.test.mjs'"` | `0` | `ℹ tests 32 / ℹ pass 32 / ℹ fail 0` |
| 12 | `sh -c "node --test test-kits/**/*.test.mjs"` (counterfactual: quotes removed) | `0` | `ℹ tests 6 / ℹ pass 6 / ℹ fail 0` |
| 13 | `git diff --stat f28fb8e HEAD -- contract-catalog/ test-kits/contracts/` | `0` | empty (no drift) |
| 14 | `git diff --stat f28fb8e HEAD -- .github/` | `0` | empty (no drift) |
| 15 | `node scripts/scan-repository-secrets.mjs <scratchpad>/decoyonly` (12 synthetic decoy secret/PII classes) | `0` | no output — **nothing detected** |
| 16 | `node scripts/scan-repository-secrets.mjs <scratchpad>/scannertest` (decoys + 4 in-pattern decoys) | `70` | `potential secret pattern found in: .../caught.txt` (only the in-pattern file) |
| 17 | `node scripts/scan-repository-secrets.mjs <scratchpad>/unreadable` with the matching file `chmod 000` | `0` | no output — **silently skipped** |
| 18 | same directory after `chmod 644` (control) | `70` | `potential secret pattern found in: .../secret.txt` |
| 19 | `node scripts/validate-capability-profiles.mjs` after adding `cc-a1-bastion.json` | `0` | no output |
| 20 | `npm run check` after adding `cc-a1-bastion.json` | `0` | `ℹ tests 32 / ℹ pass 32 / ℹ fail 0` |

Runs 15–18 were executed against throwaway directories in the session scratchpad,
outside the repository working tree. No decoy content was written into the repository.

## 1. Repository secret scan and scanner adequacy

`node scripts/scan-repository-secrets.mjs` exits `0` on the head commit (run 1) and
still exits `0` after this review's two added files (run 20 includes `scan:secrets`).

**The scanner is weak and its clean exit must not be read as broad secret coverage.**
`scripts/scan-repository-secrets.mjs` matches exactly five patterns: PEM private-key
headers, `sk_(live|test)_…`, `whsec_…`, `AKIA…`, and `gh[pousr]_…`. I probed it with a
scratchpad file containing twelve realistic, entirely synthetic decoys — OpenAI-style
`sk-proj-…`, Anthropic-style `sk-ant-api03-…`, Google `AIza…`, Slack `xoxb-…`, a JWT,
a Postgres DSN with an inline password, `DB_PASSWORD=` and `API_KEY=` environment
assignments, an SSH public key, an Azure storage connection string, a synthetic Thai
customer PII record (name, email, phone, national-ID-shaped number), and a private
internal hostname URL. **The scanner reported nothing and exited `0`** (run 15), while
correctly flagging a control file holding the four in-pattern values (run 16).

Two further weaknesses:

- **Fails open on unreadable files.** `readFile(...).catch(() => null)` means a file the
  process cannot read is treated as clean. A file containing `sk_live_…` exited `0`
  while unreadable and `70` once readable (runs 17–18). A scanner that gates a
  "synthetic-only" attestation should fail closed on a file it could not inspect.
- **Working tree only.** It scans the checked-out tree, never git history or the staged
  index, so a secret committed and later removed is invisible to it.

None of this is caused or worsened by WP-0A-A0-002 — the scanner is untouched by the
diff (`scripts/` has no file line in `git show 1873ade --stat`). It matters here only
because this package's central claim is that `npm run check` now covers more, and the
secret-scan leg of `npm run check` is the weakest control in the chain. Recorded as
condition **C1** below.

## 2. Data classification of the change

Files added or modified by `1873ade`:
`.agents/capability-profiles/cc-a0-atlas.json`,
`architecture/decisions/RFC-2026-003-contract-test-coverage-and-ownership-transfer.md`,
`evidence/WP-0A-A0-002/author-self-check.md`,
`handoffs/WP-0A-A0-002-author-handoff.json`, `package.json`,
`work-packages/WP-0A-A0-001.json`, `work-packages/WP-0A-A0-002.json`,
`work-packages/WP-0A-CON-001.json`.

I read every one of these in full in the diff. Finding:

**Data classification: synthetic-only, as declared in `security_privacy` of the
manifest.** No API key, token, password, production secret, private URL, customer PII,
customer content, or real provider identifier appears in any added or modified file.
The content is agent run identifiers, repository-relative paths, glob patterns, pinned
Node/npm version strings, test counts, and prose. No provider account, project, tenant,
endpoint, or region identifier is present.

The contract fixtures the newly-covered tests read are likewise synthetic: every
identifier is an all-zero UUID (`00000000-0000-4000-8000-0000000000xx`), actor ids are
role words (`research-worker`), and the only reference URI is the non-resolvable
`synthetic://input/…` scheme. No real hostname, bucket, or provider id appears.

One minor, non-blocking observation (**S-7**): `evidence/WP-0A-A0-002/author-self-check.md`
quotes the operator's local absolute paths (`/Users/bank/.local/node-v24.20.0/bin/node`,
`/Users/bank/ThinkBizThai`), disclosing the local username and home layout. This is not
a secret, private URL, or customer datum, and it matches existing repository practice,
so I do not treat it as a defect. Prefer repository-relative paths in future evidence.

## 3. Security properties the newly-covered contract tests guard

`test-kits/contracts/shared-kernel-contract-catalog.test.mjs` holds six tests that
`npm run check` did not execute before this change. They are not cosmetic; four of them
assert security properties directly:

- **Tenant isolation (deny-by-default tenant context).** `hasTenantContext` requires a
  non-empty `workspace_id`, an `actor` of kind `user` or `system_actor` with a non-empty
  id, `request_id`, and `correlation_id`. The negative fixtures
  `ctr-ten-001/examples/invalid-missing-workspace.json` and
  `ctr-evt-001/examples/invalid-missing-tenant.json` assert that an envelope with no
  workspace and an event with no `tenant_context` are rejected — i.e. no cross-tenant or
  tenant-less envelope may validate.
- **Tenant identity is server-resolved.** The test asserts
  `ctr-ten-001/manifest.json` `trust_boundary` matches `/Server-resolved only/`,
  guarding against a client-supplied tenant identity — the direct precondition for the
  deny-by-default RLS rule in `CONTRIBUTING_AGENTS.md`.
- **No raw provider data in error details or event payloads.** The test asserts
  `CTR-ERR-001` `details.maxProperties === 0`, `CTR-EVT-001` `payload.maxProperties === 0`,
  and `CTR-EVT-001` `metadata.additionalProperties === false`; the negative fixtures
  `invalid-unsafe-detail.json` and `invalid-unsafe-payload.json` both carry a
  `raw_provider_response` key. This is the leak channel by which provider responses —
  a common carrier of secrets, tokens, and customer content — reach error envelopes,
  logs, and the event bus. These tests are the guard against it.
- **No public URL in job references (exfiltration / SSRF surface).** The test asserts
  `CTR-JOB-001` `input_ref.not.pattern === '^https?://'` and the same for `result_ref`,
  and the fixture validator independently enforces `!/^https?:\/\//.test(input_ref)`.
  This prevents a user- or provider-supplied public URL from being persisted in a job
  envelope and later dereferenced by a worker.
- Supporting job-integrity constraints: `max_attempts >= 1`, `timeout_seconds >= 1`, and
  a required `dedupe_key` — the contract-level basis for the "no lost jobs" and
  "idempotent publishing" stop-the-line rules.

**Verified the current fixtures still pass every one of these negative cases**:
`node --test test-kits/contracts/*.test.mjs` → `tests 6 / pass 6 / fail 0` (run 7), and
the same six appear by name in the 32-test `npm run check` output (run 2).

### Is the uncovered period a security gap that must be recorded?

**Yes, it must be recorded — and no regression was actually realized.** Both halves matter.

The gap is real: `test-kits/contracts/shared-kernel-contract-catalog.test.mjs` was added
in `f28fb8e` and, until `1873ade`, was executed by no command in `npm run check` and
therefore by no CI run. `.github/workflows/ci.yml` runs only `npm run check`. Every
`npm run check` citation in the WP-0A-CON-001 review, test, and integration evidence
therefore attests to a command that excluded that package's own contract tests. For the
duration of the window, the tenant-isolation, unsafe-detail/payload, and public-URL
guards above were unenforced by CI, and a regression in any of them would have passed
green. That is a control gap and belongs in the record regardless of outcome.

However, **no contract fixture could have regressed unnoticed during the window**, and I
verified this rather than assuming it. `git diff --stat f28fb8e HEAD -- contract-catalog/
test-kits/contracts/` is empty (run 13): not one byte of the contract catalog, its
schemas, its fixtures, or the contract test changed between the commit that introduced
them and the head commit under review. `git log --oneline f28fb8e..HEAD -- contract-catalog/`
is likewise empty. The only commits in the window are `73c35a0` and `dcafcf8`, both
documentation. The window's realized security impact is therefore nil, and the six tests
pass on their first CI-covered execution.

The correct disposition is to record the gap as a coverage defect with this no-drift
finding attached, so the Integration Owner's ruling on whether WP-0A-CON-001 evidence
must be re-executed is made on evidence and not on assumption. Recorded as condition
**C3**. That ruling is the Integration Owner's, not mine.

## 4. `package.json` command-injection, quoting, and traversal analysis

New value: `"test:bootstrap": "node --test 'test-kits/**/*.test.mjs'"`.

- **No command injection.** The value is a static literal in a version-controlled file.
  It interpolates no variable, no argument, no environment value, and no file content.
  There is no attacker-controlled position in the string. `npm run check` chains it with
  `&&` only, so no substitution or subshell is introduced.
- **No path traversal, no escape from `test-kits/`.** The pattern contains no `..`, no
  leading `/`, and no backslash. Node's test-runner glob resolves relative to the
  process cwd and does not walk above the pattern root.
- **Quoting behaves identically across shells — and the quotes are load-bearing.** npm
  executes scripts through `sh` (`dash` on ubuntu-24.04). Single quotes stop the shell
  expanding the pattern, so Node receives it literally and expands it itself. Verified:
  `sh` → 32 tests (run 10), `bash` → 32 (run 11), `zsh` login shell via `npm run check`
  → 32 (run 2). The counterfactual matters: with the quotes removed under `sh`, `dash`
  has no `globstar`, so `test-kits/**/*.test.mjs` degrades to `test-kits/*/*.test.mjs`
  and matches **only** the 6 contract tests, silently dropping the 26 top-level ones
  (run 12). The change would then have looked like it worked while halving coverage.
  **The quotes must not be removed, and any future edit to this line must be re-verified
  under `sh`, not only under `zsh`.** I recommend this be stated in RFC-2026-003.
- **Blast radius (S-6, informational).** The corrected pattern will execute *any*
  `*.test.mjs` file placed anywhere under `test-kits/` in CI, including a future
  `test-kits/node_modules/` or a vendored subtree. RFC-2026-003 cites the automatic
  pickup as intended behaviour. It is a modest and acceptable widening of what CI
  auto-executes, but it means adding a file under `test-kits/` is now enough to make CI
  run code, with no root-config change and no second reviewer. Worth naming in the RFC.
- **Coverage is a strict superset.** 26 (previous, runs 8–9) + 6 (contracts, run 7) = 32
  (new, run 2). No test was removed, renamed, skipped, or marked `todo`: the run reports
  `skipped 0 / todo 0 / cancelled 0`. Every previously-executed test still executes.

## 5. Network, credentials, migrations, RLS, tenant isolation, production config, lockfile

Confirmed **none introduced**:

- **Network:** no fetch, request, URL dereference, or provider call in any added or
  modified file. Manifest declares `network_policy: deny-unless-declared` and declares
  none. All verification commands are Node-only and offline.
- **Credentials/secrets:** none. Manifest declares `secrets_required: false`. The added
  capability profile sets `can_access_external_secrets: false`, which
  `scripts/validate-capability-profiles.mjs` enforces as a hard `exit 67`.
- **Migrations / schema / RLS / tenant isolation:** `db/` and `migrations/` are in
  `forbidden_paths` and appear nowhere in the diff. No migration reservation is claimed.
  No RLS policy, tenant hierarchy, or isolation rule is changed. The contract-level
  tenant-isolation guards are only newly *enforced*, never modified —
  `contract-catalog/` is byte-identical to `f28fb8e` (run 13).
- **Production configuration:** `.github/` is untouched by the commit and identical to
  `f28fb8e` (run 14). No workflow, permission, runner, action pin, environment, or
  branch-protection setting changes. `permissions: contents: read` and
  `persist-credentials: false` in `ci.yml` are unchanged.
- **`package-lock.json`: untouched.** It is in this package's `forbidden_paths`, it has
  no file line in `git show 1873ade --stat`, and it was also removed from WP-0A-A0-001's
  writable paths only for `package.json` — the lockfile entry there is untouched. The
  installed dependency graph is unchanged, so there is **no supply-chain delta**. CI
  still runs `npm ci --ignore-scripts`. The repository has no runtime dependencies.

## 6. Does the change weaken any existing check?

**No.**

- No test is removed, skipped, or disabled; coverage is a strict superset (section 4).
- The ownership and role-separation validators still run inside `npm run check` via
  `validate:protocol`, and `scripts/` is untouched.
- Their own negative tests still execute and pass: `test-kits/work-package-ownership.test.mjs`
  (6 tests, including *rejects an output outside writable paths*, *rejects an output that
  matches a read-only path*, *rejects wildcard output declarations*, *rejects absolute,
  traversal, and directory-like ownership paths*, *rejects a writable path that captures
  another package output*) and `test-kits/role-separation.test.mjs` (8 tests, including
  *rejects a Ready manifest with duplicate named role IDs*, *rejects a Ready manifest
  with a conditional approval role assigned to the reviewer run*, *rejects a Ready
  manifest with an empty named role ID*). All pass in run 2.
- The two manifest amendments **tighten** rather than loosen: WP-0A-CON-001 goes from
  `contract-catalog/shared-kernel/**` + `test-kits/contracts/**` + an unused
  `fixtures/contracts/**` to six exact paths, and WP-0A-A0-001 gives up `package.json`.
  Both packages' declared outputs remain covered — the ownership validator enforces
  output coverage (`exit 68` when an output falls outside `writable_paths`) and exits
  `0` (run 3).
- The secret-scan leg still runs and still exits `0` — with the caveats in section 1,
  which are pre-existing and not a weakening introduced here.

## 7. Findings

| ID | Severity | Finding | Introduced by this change? |
|---|---|---|---|
| S-1 | Medium | `scripts/scan-repository-secrets.mjs` detects five pattern families and missed all twelve realistic decoy secret/PII classes I tested; it also fails open on unreadable files and never inspects git history. `npm run check`'s clean exit is not evidence of broad secret coverage. | No — pre-existing, untouched by the diff |
| S-2 | Low | Six contract tests guarding tenant isolation, unsafe detail/payload, and public-URL job references were unexecuted by CI from `f28fb8e` until this fix. **No regression was realized** — `contract-catalog/` and `test-kits/contracts/` are byte-identical across the window (run 13) and all six tests pass now (run 7). | No — this change closes it |
| S-3 | Low | WP-0A-A0-002 is the only manifest claiming a wildcard write (`.agents/capability-profiles/cc-*.json`) over the capability-profile directory, which is the trust anchor for separation of duties; every other package names exact files and WP-0A-A6-001 declares the directory read-only. Role separation is enforced on self-declared string IDs, so wildcard write authority there is authority to mint role identities. Not exploited: the Author added one profile, and this review added one. | Yes — new declaration |
| S-4 | Low | The Author transferred write authority over protected root configuration (`package.json`) to its own package by amending another package's manifest, under an RFC that is `Proposed`, not approved. Disclosed by the Author and flagged for the Integration Owner. This is change control and separation of duties, **not** a security/privacy defect; I record it and defer the ruling. | Yes — disclosed |
| S-5 | Info | `scripts/validate-work-package-ownership.mjs` compares declared manifests to each other only; it never compares an actual diff to `writable_paths`. Ownership is a declarative control, not an enforced one. | No — pre-existing |
| S-6 | Info | The corrected glob makes CI execute any `*.test.mjs` placed anywhere under `test-kits/`, with no root-config change. Intended per RFC-2026-003; worth naming explicitly there. No injection or traversal risk. | Yes — intended |
| S-7 | Info | `evidence/WP-0A-A0-002/author-self-check.md` quotes local absolute paths disclosing the operator's username and home layout. Not a secret, private URL, or customer datum. | Yes — minor |

No stop-the-line condition under `CONTRIBUTING_AGENTS.md` was found: no secret exposure,
no tenant leakage, no duplicate external side effect, no lost job, no migration
divergence, no irreversible deletion, and no contract mismatch.

## 8. Conditions

- **C1 (S-1).** Record the demonstrated coverage limits of
  `scripts/scan-repository-secrets.mjs` in RFC-2026-003 Limitations or in the package's
  known limitations, and open a follow-on package to strengthen it **before** any package
  handles permissioned data, customer content, or a real provider credential. Minimum
  scope: fail closed on unreadable files, and add `sk-`/`AIza`/`xox`/JWT/DSN/inline
  `KEY=value` assignment patterns. This is a scanner-owned change and out of scope here.
- **C2 (S-3).** Narrow WP-0A-A0-002's `.agents/capability-profiles/cc-*.json` to the
  exact profile filenames the package delivers (`cc-a0-atlas.json`, `cc-a1-bastion.json`,
  and each further role run's profile as it is added), so no manifest holds wildcard
  write authority over the separation-of-duties trust anchor.
- **C3 (S-2).** Record the CI-coverage window `f28fb8e..1873ade` as a documented coverage
  defect, with the no-drift finding in section 3 attached, so the Integration Owner's
  ruling on re-executing WP-0A-CON-001 evidence rests on evidence.
- **C4 (traceability, non-security).** `outputs.files` in `work-packages/WP-0A-A0-002.json`
  does not list `.agents/capability-profiles/cc-a1-bastion.json` or
  `evidence/WP-0A-A0-002/review-security.md`. Both sit inside the package's declared
  `writable_paths` and the ownership validator exits `0` (run 3), so nothing is violated.
  The Integration Owner should either declare them or rule that independent-role evidence
  need not be pre-declared. This review deliberately did not edit that manifest.

None of these conditions requires a change to the two lines of substance in this diff.

## 9. Verdict

Security and privacy assessment of `1873ade`: the change introduces no secret,
credential, network access, customer PII, customer content, migration, RLS change,
tenant-isolation change, production configuration change, or dependency-graph change,
and it does not weaken any existing check. Its direct security effect is **positive** —
six contract tests guarding tenant isolation, raw-provider-data leakage into error and
event envelopes, and public-URL job references now execute in CI instead of silently not
running. I withhold unconditional approval solely because S-1 and S-3 are real and
should be recorded and acted on rather than passed over, not because anything in this
diff is unsafe.

VERDICT: security_approved_with_conditions

This is Security/Privacy evidence only. It is not Reviewer, Tester, Integration, Product
Owner, merge, or Gate G0 approval. Gate G0 remains Specification Baseline Complete /
External Verification Pending. RFC-2026-003 remains `Proposed`. The package must not
advance on this record alone.
