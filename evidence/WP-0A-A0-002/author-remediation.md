# WP-0A-A0-002 — Author remediation of independent-role conditions

Author run: `/claude/a0_atlas` (Anthropic, `claude-opus-5`)
Reviewed commit: `1873ade`
Branch: `agent/claude/WP-0A-A0-002-contract-test-coverage`
Date: 2026-08-31

Author evidence only. Not review, security, test, integration, Product Owner, or
merge approval, and it does not move Gate G0. Every condition below was raised by
an independent run; none was self-identified.

## Verdicts received on `1873ade`

| Role | Run | Verdict |
|---|---|---|
| Reviewer | `/claude/c0_contract_reviewer` | `approved_with_conditions` |
| Security/Privacy | `/claude/a1_bastion` | `security_approved_with_conditions` |
| Tester | `/claude/q0_sentinel` | `test_verified_with_conditions` |

No run reported a falsified Author claim. The Tester replayed 7 of 7 handoff
commands with matching exit codes and results, and the Reviewer stated it looked
specifically for an overstatement in the Author's claims and found none.

## R4 / Tester C1 — no coverage floor (found independently by two runs)

The most serious finding, and correctly so: `node --test` exits `0` reporting
`tests 0` when its pattern matches nothing, so the corrected command still
reproduced the silent-green class this package exists to close. Mitigated, not
closed.

Closed by `scripts/verify-test-coverage-floor.mjs`, wired into `npm run check`
ahead of `test:bootstrap`. It parses the declared `test:bootstrap` pattern,
walks `test-kits/` on disk, and fails when the pattern would miss a discovered
file, when fewer than eight test files exist, when the pattern is not
single-quoted, or when the suite collapses into one directory.

Verified by deliberate regression on pinned Node `24.20.0` / npm `11.19.0`:

| Injected regression | Result |
|---|---|
| `test:bootstrap` reverted to `node --test 'test-kits/*.test.mjs'` | `npm run check` exit **76** — `pattern 'test-kits/*.test.mjs' does not match 1 discovered test file(s): test-kits/contracts/shared-kernel-contract-catalog.test.mjs. These would silently never run.` The identical state exited `0` before the guard. |
| `test:bootstrap` pattern left unquoted | exit **74** |
| pattern matching nothing / suite emptied | exit **75** |
| suite confined to one directory | exit **77** |
| corrected state restored | exit `0`, `tests 40 / pass 40 / fail 0` |

`test-kits/test-coverage-floor.test.mjs` adds 8 tests covering each rejection
path plus globstar boundaries (`other-kits/a.test.mjs` and `test-kits/a.mjs` must
not match). `npm run check` goes 32 → 40.

## R1 — RFC did not authorize the `fixtures/contracts/**` removal

Correct and accepted. The commit removed three globs from WP-0A-CON-001 while
RFC-2026-003 Decision 3 named two. The RFC is the artifact that goes to Product
Owner disposition, so the authority record had to match the change. Decision 3
now names all three and states why the third is unused.

## R2 — forced vs anticipatory amendments were presented as equally compelled

Correct and accepted. RFC-2026-003 now carries a necessity table: the
WP-0A-A0-001 `package.json` removal is **forced today** (the ownership validator
exits `70` while two packages hold it — independently reproduced by the Tester
against a reconstructed pre-amendment manifest set), while all three
WP-0A-CON-001 removals are **anticipatory** (the repository validates with them
restored; the Reviewer confirmed with a synthetic WP-0A-CON-002 that they bite
only once a follow-on package declares outputs there).

## R3 — amended manifests carried no trace of the amendment

Correct and accepted. Both `work-packages/WP-0A-A0-001.json` and
`work-packages/WP-0A-CON-001.json` now carry an `ownership.amended_by` block
naming WP-0A-A0-002, the authorizing decision record, the exact change, whether
it was forced or anticipatory, and
`acknowledgement_required_from: "/root/r0_steward"` with
`acknowledgement_status: "pending"`.

## Security C2 — wildcard write over the separation-of-duties trust anchor

Correct and accepted, and the sharpest of the security conditions. This package
was the only manifest claiming wildcard write (`.agents/capability-profiles/cc-*.json`)
over the directory that anchors separation of duties. Replaced with the five
exact declaration paths.

## R5 — stale head SHA in the handoff

`handoffs/WP-0A-A0-002-author-handoff.json` now records `1873ade`, the commit it
actually describes, plus a `superseded_by` pointer to this document.

## R6 / R7 / Security C4 — role assignments and declared outputs

All five role runs are now named in `role_assignments`. `outputs.files` now
declares the independent-role artifacts this package cannot reach `done` without.
Status deliberately remains `backlog`: `/claude/r0_steward` has not yet recorded
its own capability declaration, and the capability validator must not be
satisfied by a declaration the Author wrote on an independent run's behalf.

## Cross-vendor exception — recorded, not waived

Not raised by any run; recorded here because the baseline requires it. The
Decision Register directs cross-vendor review for critical code and permits a
single-vendor fallback only as an explicit recorded exception. Every run on this
package is Anthropic `claude-opus-5`, so `prefer_cross_vendor_review` is **not**
satisfied. Recorded in `independence.cross_vendor_exception`. Five separate agent
runs with distinct declarations, none reviewing its own work, is the fallback the
baseline allows — it is not equivalent to cross-vendor review.

## Conditions NOT closed by this Author, by design

- **RFC-2026-003 remains `Proposed`.** Product Owner disposition is required
  before the RFC-2026-002 manual merge. An Author cannot approve its own RFC.
- **The `/root/r0_steward` acknowledgements are pending.** That is an OpenAI
  Codex run, unavailable in this session. Both manifests record it.
- **The WP-0A-CON-001 `npm run check` addendum is pending** on the same run.
- **Security C1 — the secret scanner is materially weak.** Independently
  demonstrated: none of twelve realistic synthetic credential decoys detected, it
  fails open on an unreadable file, and it never inspects git history. Pre-existing
  and outside this package's scope; recorded as an open blocker that must be closed
  before any package handles permissioned data or a real credential.
- **Tester C5 — concurrent runs wrote into the tree** during verification. Noted;
  each run wrote only its own declared deliverables.

## Verification after remediation

| Command | Exit | Result |
|---|---|---|
| `npm run check` | `0` | `tests 40 / pass 40 / fail 0` |
| `node scripts/verify-test-coverage-floor.mjs` | `0` | no output |
| `node scripts/validate-work-package-ownership.mjs work-packages` | `0` | no output |
| `node scripts/validate-capability-profiles.mjs` | `0` | no output |
| `node scripts/scan-repository-secrets.mjs` | `0` | no output (see Security C1 on what this does and does not prove) |

The remediation delta has not yet been independently re-verified. It requires a
fresh Reviewer and Tester pass before Integration.
