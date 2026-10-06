# C0 re-verification: WP-0A-CON-002 at `568658c` (Draft PR #193)

| | |
|---|---|
| Run | `/claude/c0_contract_reviewer` |
| Role | Independent Reviewer (contract/architecture), WP-0A-CON-002. A re-verification of my own last verdict (`review-contract-rework.md`, head `28d3142`, 2026-08-31, `VERDICT: changes_requested`) against the Author's closure record |
| Subject | branch `agent/claude/WP-0A-CON-002-restore-rfc-002` (Draft PR #193), head `568658cf8639b85581ea0003d2f4844b36ae1424` (handoff only) over `0d649fb` (the change); base `origin/main` `8c089cc`. Author `/claude/a0_atlas` |
| Records under review | `evidence/WP-0A-CON-002/author-conditions-closure-2026-10-06.md`; `git diff 8c089cc..568658c` (7 files); `work-packages/WP-0A-CON-002.json`; `handoffs/WP-0A-CON-002-author-handoff.json` |
| Date | 2026-10-06 (file name as the brief gave it) |

This file records findings. It advances no status, approves nothing on anyone else's behalf, and
countersigns no `x-amended-by` acknowledgement. Whether it counts as the Reviewer's signature is for
the Integration Owner and the Product Owner to decide.

## §0 What I am

- I am a subagent spawned by `/claude/a0_atlas`, the Author of the work under review, through a
  workflow script (RFC-2026-024 §3/4 spawning disclosure). The brief listed what the Author says it
  did and did not do. I checked each claim against the diff and against executed probes, not against
  the brief.
- I am the same vendor and model family as the Author. RFC-2026-024 withdrew the cross-vendor
  condition, and on 2026-10-05 the Owner applied that withdrawal to this package (step 2 item 1, now
  recorded in the manifest's `independence`). That does not make me independent of the brief.
- I wrote only this file, in one commit, and pushed nothing. I did not re-run CI, comment on the PR,
  or touch the branch.

## §1 How I measured

"**Measured**" means I ran it and saw the result. "**Read**" means I read the file and executed
nothing.

- **Toolchain (measured).** `node --version` → `v24.20.0`. No database is used by this package's
  contract suites; `npm run check` brought up nothing on any port that I started.
- **Branch-name clone (measured).** A private clone in
  `scratchpad/c0-WP-0A-CON-002/clone`, checked out as the branch **name**
  `agent/claude/WP-0A-CON-002-restore-rfc-002` at `568658c`, with `origin/main` fetched from GitHub
  (`8c089cc`) and `origin/agent/claude/WP-0A-CON-002-restore-rfc-002` = `568658c`. Not detached.
- **Probe extraction (measured).** `git archive 568658c` into `scratchpad/c0-WP-0A-CON-002/pristine`;
  every probe ran on a fresh copy of it (`work/`), one mutation per copy, then all ten
  `test-kits/contracts/*.test.mjs` files and `node scripts/verify-test-coverage-floor.mjs`. Probes
  that edit a test file were run twice: once raw (the coverage floor's digest check catches every
  such edit, exit 86) and once after `node scripts/regenerate-integrity-manifest.mjs`, so the test
  logic itself is what is measured.
- **CI (read, via `gh`).** PR #193 and run `37371252667`, read-only.

## §2 Declared commands, replayed at `568658c` on the branch name

| Command | Exit | Observed |
|---|---:|---|
| `npm run check` | `0` | `tests 692 / pass 692 / fail 0` (matches the handoff's 692) |
| `node --test test-kits/contracts/catalog-reference-integrity.test.mjs` | `0` | `6 / 6` |
| `node --test test-kits/contracts/shared-kernel-envelope-contracts.test.mjs` | `0` | `15 / 15` |
| `node --test test-kits/contracts/shared-kernel-schema-conformance.test.mjs` | `0` | `6 / 6` |
| `node scripts/validate-work-package-ownership.mjs work-packages` | `0` | clean |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-CON-002.json` | `0` | clean |
| `node scripts/verify-branch-scope.mjs origin/main WP-0A-CON-002` | `0` | "all 7 changed path(s) are declared, and every amendment explains one" |
| `npm run check:handoff` | `0` | "describes the branch: nothing substantive after its cited head" |
| all ten contract suites (probe baseline, `pristine/`) | `0` | `79 / 79`; coverage floor exit `0` |

The test count did not move (no test added or renamed); assertion counts did.

## §3 My earlier findings and conditions, re-measured

Probe table (measured, fresh copy each; "+regen" = integrity digests regenerated after the edit):

| Probe (my finding) | Mutation | Suites | Floor | Caught by |
|---|---|---:|---:|---|
| N1 / C1 | `validIdempotency` requires `^sha256:[0-9a-f]{64}$` again, +regen | 1 (2 fail) | 0 | `every valid fixture is accepted…`, `the predicate and the shipped schema agree on every fixture` |
| N2 | delete root `additionalProperties` of `ctr-ten-001` | 1 (6 fail) | 0 | `every catalog schema closes its root…`, `an extra property carrying a secret…`, mutation coverage, constraint record |
| N3 | `valid-first-page-request.json` sort = one field twice (asc/desc) | 1 (3 fail) | 0 | `duplicate sort fields do not count as a tiebreaker`, predicate/schema agreement |
| N4 | `ctr-pag-001` manifest `"schema": "envelope.json"` (copy of its schema) | 1 (7 fail) | 0 | undeclared-file tests, conformance, root-closure |
| C2 laundering (my §4 attack, repeated) | delete `allOf[1].then.not.required:["cursor"]`, add `accepted-gap-page-echoes-request-cursor.json` with a 40-word owner-naming reason | 1 (4 fail) | 0 | `an accepted gap cannot be rewritten into a reassurance`, `the fixture set is what it was…` |
| C3 / B3 | `tenant_context: {allOf:[{$ref:"../ctr-err-001/schema.json"}]}` | 1 (8 fail) | 0 | root-required, mutation-coverage and constraint-record ratchets |
| C3 / B5 | `ctr-err-001` `$id` forged to `CTR-TEN-001` | 1 (2 fail) | 0 | `every $ref points at a canonical contract schema whose $id matches its directory` |
| N5 (now CON-005's field) | delete `ctr-job-001` `input_ref.pattern` | 1 (8 fail) | 0 | `CTR-JOB-001 rejects every demonstrated hostile reference…` and five more |

| Item | State at `568658c` | How I know |
|---|---|---|
| **N1 / C1** sha256 pin and cursor charset in the predicate | **Closed** (at main, `7b1e228`). Neither string appears as a rule in the predicate; reintroducing the pin fails two tests even with digests regenerated | measured |
| **N2** guard self-disables | **Closed** at main | measured |
| **N3** tautological E2, duplicate sort keys | **Closed** at main. The test exercises `validPage`; the schema declares the gap as `x-distinct-fields-rule` (JSON Schema cannot express it), so the rule lives in the predicate and is declared, not faked | measured, read |
| **N4** opt-out by naming another schema file | **Closed** at main | measured |
| **N5** CTR-JOB-001 deny-list | **Closed** at main by WP-0A-CON-005 (RFC-2026-006) | measured |
| **N6** validator holes V1–V4 | **Closed.** V1–V3 and RFC 3339 at main; Q0's code-point V4 closed **here**. `minLength:2` rejects one U+1F600; `maxLength:1` accepts it and rejects `e`+U+0301 (two code points), as the specification counts | measured (unit calls) |
| **N7** `ctr-pag-001` `source_references` | **Open, owed** to the contract owner via the Candidate change path (`open_blockers[14](a)`). Correctly not done here | read |
| **N8** `x-` keys uninspected | **Closed in substance** at main (the annotation ratchet); `assertSchemaSupported` still skips `x-` keys. I accept the ratchet as the control | read; A0 measured, not re-run by me |
| **C2** `accepted_gaps` acknowledgement field + `freeze_boundary` cross-reference | **Laundering closed** (measured above); **structural field still owed** (`open_blockers[14](b)`). The 81-character gate I objected to is gone: the reason now needs distinct words and an owner phrase, and the fixture set is pinned | measured, read |
| **C3** identity from resolved path, `$id` ↔ directory for all | **Closed** at main | measured (B3, B5) |
| **C4** amendment staged; (d) independent content-neutrality proof; (e) pre-freeze limit | RFC-2026-004 **Approved 2026-09-02** (line 3), so the amendment is authorized. Both `x-amended-by` records (`ctr-evt-001/schema.json:130-136`, `ctr-job-001/schema.json`) still read `/root/r0_steward`, `pending`; the successor `/claude/r0_steward` is named, not yet acknowledging. (e) **not met in the RFC text**: RFC-2026-004 still does not state that its licence ends at freeze. The Owner approved it as written; changing it is a governance edit outside this PR. Carried, not blocking this PR | read |
| A5 dir-case, A6, A9, A11, B1, B8 | **Closed** at main per A0's §1; I re-ran B3/B5 only | read, partly measured |
| **A7** cross-file JSON Pointer false positive | **Superseded by design** (a `$ref` may target only a canonical `schema.json`). I accept that | read |
| **R6, R10, R12** | **Open, owed** to the contract owner before freeze (`open_blockers[14](c)`); R10's `composes` is now pinned by the registry | read |
| **R8** (RE2 portability of the lookaheads, my 106f91c review) | **Closed** at main by the `64d9c65` lookahead removal, which the schemas' own `x-reference-rule` text says | read |
| **N-C1** `acknowledgement_status` read by nothing | **Open, owed** to the `scripts/`/CI owner (`open_blockers[14](e)`) | read |

## §4 What this branch changes, checked

| Change | Verdict | How I know |
|---|---|---|
| `json-schema-subset.mjs` counts code points | Correct and spec-aligned. Reverting it (+regen) fails `every catalog schema uses only keywords this validator actually enforces`. It makes `maxLength` slightly more permissive for astral text (a 128-code-point `job_id` of emoji was 256 units, previously rejected); that is what every real validator and PostgreSQL character length do, so it is a correction, not a widening of the contract | measured |
| `isPrivateRef` uses the schemas' lookahead-free `PRIVATE_REF`, and the agreement test asserts textual identity with `status_ref`, `deep_link_ref`, `result_ref` | Correct. My own fuzz: 300,000 strings over a hostile alphabet (`..`, `//`, `:`, newline, `é`, `%2e`), 19,798 accepted, **0** divergent between old and new. Reinserting `(?!\/)` (+regen) fails the agreement test. Note: `new RegExp(p,'u').source` escapes `/` as `\/`, which is why the comparison with the literal's `.source` holds; it compares the `source`, not flags, so a flag drift would not be caught (INFO) | measured |
| Hostile-scheme test also targets `deep_link_ref` and carries the two S3 forms | Correct. Deleting `deep_link_ref.pattern` fails 6 tests. Dropping the new target or the two new values from the test (+regen) exits 0, as any test-text weakening does; that edit is held by the integrity digest (raw edit → floor exit 86) and by review. By design, not a finding | measured |
| Integrity manifest: three digests | Correct; floor exit 0 at head, 86 on any further edit | measured |
| Manifest: Owner step 2 (items 1–3), blockers [1] and [8] in place, [13] and [14] appended, `amends_without_owning` rewritten | Accurate to the disposition the Author cites; status stays `in_review`; scope guard and role-separation validator exit 0. Blocker [14](f)'s point is well taken: `ctr-api-001/**` and `ctr-idm-001/**` are in this package's `writable_paths`, so the `64d9c65` `x-amended-by` record is this package's to originate, through the Candidate path | measured, read |
| No contract, schema, fixture, index or freeze-level change | Confirmed by the 7-file diff; `index.json` untouched (9 Candidate / 5 Draft at main) | measured |

## §5 Findings

| ID | Severity | Finding |
|---|---|---|
| **K1** | **Merge-blocking (process), not a defect** | **No green CI exists for `568658c`.** The only run for this head, `37371252667` (`pull_request`, 2026-10-05T20:41Z), shows the required check `bootstrap` as `cancelled` and the run `failure`; its annotation reads "The job was not acquired by Runner of type hosted even after multiple attempts". Three other branches' runs at the same minutes show no conclusion either. The tests never ran in CI. `main` requires `bootstrap` strictly, and RFC-2026-002 requires a green required CI run on the head. The local run on the branch name is green (692/692), so this is an infrastructure event, but the merge cannot proceed until CI is re-run and green. The handoff does not mention it. |
| **K2** | LOW | `work-packages/WP-0A-CON-002.json` `required_tests[6]` still reads "a reference field rejects all **eight** hostile scheme forms". The test now carries ten values across three targets. The manifest is in this branch's diff, so the wording could have moved with it. |
| **K3** | LOW (carried) | My C4(e): RFC-2026-004 still does not state that an in-place amendment of a delivered artifact is licensed only before freeze. Governance text, outside this PR; recorded so it is not lost. |
| **K4** | INFO | The agreement assertion compares `RegExp.source` only. A future change of flags (`u` vs none) on either side would not be noticed. Today both are equivalent on the ASCII-only grammar. |

Owed elsewhere and correctly not taken here: N7, C2's structural field, R6, R10, R12, N-C1, both
`x-amended-by` acknowledgements, and the `64d9c65` amendment record (`open_blockers[13]`, `[14]`).

## §6 Stop-the-line verdict

**No stop-the-line condition found at `568658c`.**

| Class | Found | How I know |
|---|---|---|
| Secret exposure | none; `npm run check` includes the secret scan; fixtures synthetic | measured |
| Tenant leakage | none; root and nested closure, `$id` binding and reference allow-lists all fail closed under mutation | measured |
| Duplicate external side effects / lost jobs | not applicable; no runtime code | read |
| Migration divergence / irreversible deletion | not applicable; no migration, no data | read |
| Contract mismatch | none; predicate and schema agree on every fixture and now print the same reference pattern | measured |

## §7 Does anything block the merge?

Yes, and none of it is a defect in this branch:

1. **K1**: a green required `bootstrap` run on `568658c` does not exist. Re-run CI first.
2. A1 and Q0 re-verification at this head and a `/claude/r0_steward` Integration verdict
   (`open_blockers[13]`) are owed. This file covers C0 only.
3. Under `CONTRIBUTING_AGENTS.md` and RFC-2026-002, the merge is the Owner's (or A0 under the standing
   delegation, only with CI green and no stop-the-line). Nothing in this file substitutes for either.

K2 is worth fixing in the same PR before the merge; it is one word.

## §8 Limits

- I re-ran B3, B5 and the listed probes; A5 directory case, A6, A11, B8 and N8 are A0's measurements,
  which I read and did not repeat.
- I did not re-read A1's or Q0's files beyond what my own conditions needed, and I do not rule on A1
  S8 (the absent cycle guard).
- I measured on macOS with Node 24.20.0, not in CI's container, and could not, because CI did not run.

## Verdict

The branch does what it says. Every condition I set at `28d3142` that this package can close is
closed and I measured each one fail closed, including my C2 laundering attack, which now fails four
tests. The three edits on this branch are correct, minimal and each bites when reverted. What remains
open is owed to other owners or to the Candidate change path and is recorded in `open_blockers[14]`.
The conditions below are what I attach.

- (1) CI `bootstrap` green on the merged head (K1).
- (2) C2's structural field, N7, R6, R10, R12 and the `64d9c65` amendment record go through the
  Candidate change path before any freeze of CTR-API-001, CTR-PAG-001 or CTR-IDM-001.
- (3) Both RFC-2026-004 `x-amended-by` records stay `pending` until `/claude/r0_steward` itself
  records the acknowledgement; no author edit flips them.
- (4) K2 corrected, here or in the next increment.

VERDICT: review_approved_with_conditions
