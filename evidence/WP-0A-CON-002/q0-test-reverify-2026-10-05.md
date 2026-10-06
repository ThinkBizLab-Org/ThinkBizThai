# WP-0A-CON-002 — Independent Tester re-verification at `568658c`

**Independent Tester evidence only.** Not a review sign-off, not a security verdict, not an
integration verdict, and no merge authority. I do not fix; nothing on the subject branch was edited.

| field | value |
| --- | --- |
| agent_run_id | `/claude/q0_sentinel` |
| role | Independent Tester |
| work package | WP-0A-CON-002 |
| subject | PR #193, branch `agent/claude/WP-0A-CON-002-restore-rfc-002`, head `568658cf8639b85581ea0003d2f4844b36ae1424` |
| base | `origin/main` `8c089cc0bf30a234efa61752c6054d670f85a2a8` (unchanged at time of measurement) |
| earlier Q0 verdict answered | `test-verdict-rework.md` at `28d3142`: `test_verified_with_conditions` |
| date measured | 2026-10-06 (file name carries the date the task was cut) |

## §0 What I am

I am a subagent spawned by `/claude/a0_atlas` (the Author of this package) under RFC-2026-024,
acting in the named Tester role `/claude/q0_sentinel`. Same vendor and model family as every other
role run on this package (Anthropic, Claude). The Owner withdrew the cross-vendor condition for this
package on 2026-10-05 (step 2 item 1); independence here is the distinct named role and this
disclosure, not a different vendor. Being spawned by the Author is the limitation a reader should
weigh: every number below was produced by executing code, and each claim of the Author's closure
record (`author-conditions-closure-2026-10-06.md`) was re-measured, not read.

## Measured vs read

**Measured** (executed by me, exit codes real):

- A private clone `git clone --branch agent/claude/WP-0A-CON-002-restore-rfc-002` into
  `<scratchpad>/q0-WP-0A-CON-002/clone`; `HEAD` = `568658c`, `git branch --show-current` = the branch
  name (not detached), so branch-reading guards ran against the real branch name.
- `node -v` = `v24.20.0`, `npm -v` = `11.19.0`, `.node-version` = `24.20.0`.
- Every declared command and the full `npm run check` (table §1).
- 45 mutation probes, each in a fresh copy of the pristine clone (no `.git`, no in-place restore),
  each running all contract suites `node --test test-kits/contracts/*.test.mjs` (79 tests) plus
  `node scripts/verify-test-coverage-floor.mjs` (table §2).
- 26 unit probes against `test-kits/contracts/json-schema-subset.mjs` and 23 reference-pattern
  strings against the shipped `status_ref` pattern (§3).
- `gh pr view 193` (read-only) for the CI rollup.

**Read, not measured**: the Author's closure record, the manifest diff, the handoff. No database was
used (none needed; port 5563 untouched by me — `npm run check` ran whatever its own suites run).

## §1 Declared commands at `568658c`

| command | exit | result |
| --- | --- | --- |
| `npm run check` | **0** | `tests 692 / pass 692 / fail 0 / cancelled 0 / skipped 0 / todo 0` (coverage floor, toolchain, secret scan, protocol validators, full suite) |
| `node --test test-kits/contracts/catalog-reference-integrity.test.mjs` | 0 | 6/6 |
| `node --test test-kits/contracts/shared-kernel-envelope-contracts.test.mjs` | 0 | 15/15 |
| `node --test test-kits/contracts/shared-kernel-schema-conformance.test.mjs` | 0 | 6/6 |
| `node --test test-kits/contracts/catalog-registry.test.mjs` | 0 | 15/15 |
| `node scripts/validate-work-package-ownership.mjs work-packages` | 0 | clean |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-CON-002.json` | 0 | clean |
| `node scripts/refresh-author-handoff.mjs --check` (on the branch name) | 0 | "nothing substantive after its cited head" |
| `node scripts/verify-branch-scope.mjs origin/main WP-0A-CON-002` | 0 | "all 7 changed path(s) are declared, and every amendment explains one" |

692 equals the Author's reported `tests 692 pass 692`. Contract suites total 79 at head, equal to the
Author's 79 at main: the claim "no test added or renamed" holds by count. `skipped 0`, `todo 0`.

Diff `8c089cc..568658c`: 7 files — the closure record, the handoff, `json-schema-subset.mjs`, the two
test files, `test-kits/integrity-manifest.json` (3 digests), `work-packages/WP-0A-CON-002.json`. No
contract, schema, fixture, index, RFC, `CONTRIBUTING_AGENTS.md` or CI file changes. Confirmed not a
governance PR by path.

CI: `gh pr view 193` shows the `bootstrap` check run (Actions run `37371252667`) **QUEUED** for head
`568658c` at the time of reading. There is no green required CI run on this head yet.

## §2 Attack table re-run at `568658c`

"suites" = exit of the 79 contract tests; "floor" = exit of the coverage-floor guard. Fails closed =
either non-zero. Every row is a fresh copy.

| # | earlier result | attack (as re-run) | suites | floor | now | caught by (first failing tests) |
| --- | --- | --- | --- | --- | --- | --- |
| BASE | — | no mutation | 0 (79/79) | 0 | — | — |
| A1 | closed | `HTTPS://` status_ref, `HtTpS://` deep_link_ref, top-level `internal_sql` in `valid-accepted` | 1 | 0 | **closed** | `every valid fixture is accepted…`, `every fixture agrees with its own shipped schema…` |
| A2 | closed | A1 content renamed `accepted-gap-` with a 40-word reason | 1 | 0 | **closed** | gap ratchet, fixture-set ratchet, both fixture/schema tests |
| A3 | **open** | `status_ref: job:../../../etc/passwd` | 1 | 0 | **closed** | both fixture/schema tests |
| A3 | **open** | `deep_link_ref: content:../../secret` | 1 | 0 | **closed** | same |
| A3c | new | `result_ref: content://attacker.example.invalid/exfil` | 1 | 0 | closed | same + `a replayed key…` |
| A4 | **open** | *my original form*: a third `valid-` record (`valid-failed.json` edited in place) with the **same key and scope** as `valid-completed-replay.json` and a **different `payload_hash`** | **0 (79/79)** | **0** | **STILL OPEN** | nothing |
| A4b | — | the Author's form: change `payload_hash` of `valid-in-progress.json` (the hard-coded pair) | 1 | 0 | closed for that pair only | `a replayed key…`, `the same key with a different payload…` |
| A5 | **open** | gap reason = 81 × `x` | 1 | 0 | **closed** | substance check + gap ratchet |
| A5b | new | gap reason = 22 distinct padding words + "owner" | 1 | 0 | closed (by ratchet) | gap-digest ratchet only; the substance heuristic itself passes padding |
| b1 | **open** | `valid-first-page-request` sort `created_at desc` + `created_at asc` | 1 | 0 | **closed** | `duplicate sort fields do not count as a tiebreaker` (now calls `validPage`), predicate/schema agreement |
| b2 / b2b | closed | `has_more: true`, cursor absent / null | 1 | 0 | closed | mutation-coverage ratchets |
| b3 / b4 | closed | `data: null` / `data: []` | 1 | 0 | closed | both fixture/schema tests + payload test |
| b5 | closed | `scope.operation: "DROP TABLE users"` | 1 | 0 | closed | — |
| b6 | closed | `created_at: "not-a-date"` | 1 | 0 | closed | — |
| b6b | **open** | `created_at: "2026"` | 1 | 0 | **closed** | RFC 3339 check |
| b6c | new | `created_at: "2026-02-30T10:00:00Z"` | **0 (79/79)** | **0** | **NEW — open** | nothing (see N1) |
| b6d | new | `created_at` with no offset | 1 | 0 | closed | — |
| c1–c5, c4b | closed | extra secret keys at envelope / tenant_context / accepted / error / scope; non-empty `error.details` | 1 each | 0 | closed | both fixture/schema tests |
| c6 | new | extra key inside `tenant_context.actor` | 1 | 0 | closed | — |
| d1 | open | JWT-shaped value in declared `tenant_context.actor.id` | 0 | 0 | open, **owed to WP-0A-CON-001** (recorded `open_blockers[12]`) | nothing |
| d2 | declared gap | `internal_sql` / `debug_stack` inside `data` | 0 | 0 | declared gap (`x-leakage-boundary`) | — |
| M1 | closed | `sort.minItems` 2 → 1 | 1 | 0 | closed | mutation-coverage ratchets |
| M2 | closed | delete `status_ref.pattern` | 1 | 0 | closed | `every allow-listed reference scheme…`, coverage, constraint record |
| M3 | **open** | delete `deep_link_ref.pattern` | 1 | 0 | **closed** | same family |
| M3r | new | delete `ctr-idm-001.result_ref.pattern` | 1 | 0 | closed | same family |
| M4 | **open** | delete `ctr-ten-001` root `additionalProperties` | 1 | 0 | **closed** | coverage, constraint record, Candidate validator, conformance |
| M4b | **open** | M4 + `valid-` fixture with `tenant_context.bearer_token` and `db_password` | 1 | 0 | **closed** | same |
| M4c | new | delete `ctr-ten-001.actor.additionalProperties` + extra key in `actor` | 1 | 0 | closed | same |
| M5 | closed | delete the `has_more`/`next_cursor` `allOf` | 1 | 0 | closed | — |
| M6 | **open** | delete `shared-kernel-schema-conformance.test.mjs` | 0 (73/73) | **91** | **closed** (by the floor) | coverage floor: digested file cannot be inspected |
| M7 | closed | delete `ctr-err-001` `details.maxProperties` | 1 | 0 | closed | — |
| M8 | new | delete `sort.uniqueItems` | 1 | 0 | closed | — |
| M9 | new | `sort.items.additionalProperties: false` → `{type: string}` | 1 | 0 | closed | — |
| R1 | branch change | revert code-point length counting to `value.length` | 1 (78/79) | 86 | **bites** | `every catalog schema uses only keywords this validator actually enforces` |
| R2 | branch change | reinsert `(?!\/)(?!.*\.\.)` into `PRIVATE_REF` | 1 (78/79) | 86 | **bites** | `the predicate and the shipped schema agree on every fixture` |
| R3 | branch change | drop the new `deep_link_ref` hostile target **and** delete its pattern | 1 | 86 | bites (also held by the ratchets) | — |
| R4 | branch change | drop only the two astral assertions, fix left in | 0 | 86 | held by the digest tripwire only | — |

Totals: 45 probes; **41 fail closed**, **4 exit 0 at both** (A4, b6c, d1, d2). Of the four, d2 is a
declared gap and d1 is recorded as owed to another package; **A4 and b6c are this package's**.

## §3 Validator unit probes (`json-schema-subset.mjs` at `568658c`)

| # | earlier | probe | now |
| --- | --- | --- | --- |
| V1 | **open** | `additionalProperties` as a schema: `{a:{}}`, `{a:"toolong"}` against `{type:string,maxLength:4}` | **closed** — both rejected |
| V2 | **open** | external `$ref` with sibling `maxProperties: 0` and `required: [x]` | **closed** — both siblings enforced |
| V3 | **open** | `uniqueItems` on `[{a:1,b:2},{b:2,a:1}]`; `[1, 1.0]` | **closed** — both rejected |
| V3c | info | `enum [{a:1,b:2}]` vs `{b:2,a:1}` | rejected (over-strict; fails closed, unchanged) |
| V4 | **open** | `minLength: 2` vs one astral character | **closed** — rejected; `maxLength: 1` accepts it; `e`+U+0301 counts 2; 200 astral chars pass `maxLength: 256` |
| V5 | closed | tuple `items` | gate throws (unchanged) |
| V6 | info | `format: "uri"` | `validate` rejects every value: fails closed |
| V6b | **open** | date-time `"2026"` | **closed** — rejected |
| V6c | new | date-time `2026-02-30T10:00:00Z`, `2026-02-29T…` (2026 is not leap), `2026-04-31T…` | **accepted** — see N1 |
| V6e/f | new, info | leap second `…23:59:60Z`; lowercase `t`/`z` | rejected (over-strict vs RFC 3339; fails closed) |
| V7 | closed | `oneOf` exact-one, `integer` 1.0, `required` via prototype (`Object.hasOwn`), trailing newline vs `^ab$` | all consistent |
| S8 | A1's | pure `$ref` cycle | throws `RangeError` — fails loud, as the Author states |
| — | — | unresolvable `$ref` | returns an error (fails closed) |

Reference pattern (23 strings): every traversal, empty-segment, leading-slash, authority, query,
fragment, `@`, extra `:`, uppercase scheme, Cyrillic homoglyph, trailing newline and leading-space
form is rejected; a 304-character body matches the regex but the schema rejects it on `maxLength: 256`.

## Findings

**Q0-R1 — A4 not closed: the catalog is still not swept for conflicting idempotency records (LOW,
condition).** My original A4 was a *third* `valid-` record with the same key and scope as the stored
record and a different `payload_hash`. Re-run as an in-place edit of the existing
`ctr-idm-001/examples/valid-failed.json` (so the fixture-set ratchet does not fire), it exits **0 at
both suites and floor**. The Author's closure table measures a different probe — editing
`valid-in-progress.json`, the one pair the test hard-codes — and from that marks A4 "Closed at main".
That is a measurement of the pair, not of the catalog. What did improve: adding a *new* colliding
fixture is now caught by the fixture-set ratchet, so the open route is only an in-place edit of an
existing `valid-` record, which no digest pins. Closeable in this package's writable paths (a sweep
over `ctr-idm-001` `valid-` fixtures using `idempotencyOutcome`).

**Q0-N1 — `format: date-time` accepts calendar-impossible dates (LOW, new, condition).** The RFC 3339
regex plus `Date.parse` accepts `2026-02-30T10:00:00Z`, `2026-02-29T…` and `2026-04-31T…`, because
`Date.parse` rolls them over (`2026-02-30` → `2026-03-02`). Probe b6c ships one in a `valid-` fixture:
**exit 0**. The code's own comment says it "confirm[s] it is a real instant"; it confirms an instant,
not that the written date exists. This is the residue of my earlier b6b / V4-date finding, half
closed. The validator is in this package's `writable_paths`. Over-strictness on leap seconds and
lowercase `t`/`z` is recorded as info only (fails closed).

**Q0-I1 — CI not green on the head (INFO, blocks merge until resolved).** The `bootstrap` run for
`568658c` was QUEUED when read. My local `npm run check` is exit 0 at 692/692, but RFC-2026-002
requires a green required CI run on the head commit.

**Q0-I2 — the two V4 assertions are held in the suites by the validator, not by themselves (INFO).**
R1 shows the fix bites (78/79). R4 shows that removing only the assertions while the fix stays is
caught only by the integrity digest (floor 86), which a commit regenerating the manifest passes. The
same is true of every test in the repository; recorded so nobody reads R4 as a gap.

**Owed elsewhere, unchanged and correctly recorded:** d1 (JWT-shaped `actor.id`, CTR-TEN-001, owed to
WP-0A-CON-001, `open_blockers[12]`); d2/d3 (`data` leakage boundary, declared).

## My earlier conditions — disposition

| earlier condition (`test-verdict-rework.md`) | at `568658c` |
| --- | --- |
| V1 / V1e validator defeated via `additionalProperties` schema | closed (measured) |
| V2 `$ref` siblings dropped | closed (measured) |
| V3 `uniqueItems` by `JSON.stringify` | closed (measured) |
| V4 length in UTF-16 units | **closed on this branch** (measured; R1 bites) |
| b6b / date-time leniency | `"2026"` closed; calendar-impossible dates **open** (Q0-N1) |
| b1 duplicate sort / tautological test | closed (measured; test now calls `validPage`) |
| A3 traversal inside an allowed scheme | closed (measured, all three ref fields) |
| A4 conflicting idempotency records | **open** (Q0-R1) |
| A5 81-character padding reason | closed (substance check + gap-digest ratchet) |
| M3 `deep_link_ref` unpinned | closed at main by ratchets; now also held directly (R3) |
| M4 / M4b self-disabling `additionalProperties` guard | closed (measured) |
| M6 suite deletable with a green run | closed (floor exit 91) |
| d1 JWT in `actor.id` | owed to WP-0A-CON-001 (unchanged) |
| d2 / d3 `data` | declared gap (unchanged) |
| `isPrivateRef` printing a different pattern (CON-005 C0 F6, referred) | closed on this branch (measured; R2 bites; source equality asserted) |

## Stop-the-line

**None.** No secret, tenant leak, duplicate external side effect, lost job, migration divergence,
irreversible deletion or contract mismatch was produced. Both open items are fixture-catalog and
test-validator fidelity defects with synthetic data only.

## Does anything block the merge?

Not my findings: Q0-R1 and Q0-N1 are LOW conditions that may be carried as recorded conditions. The
merge is nonetheless blocked today by process, independent of this verdict: the head has no green
CI run (QUEUED), the latest Reviewer (`changes_requested`) and Security (`security_changes_requested`)
verdicts are still at `28d3142` and need re-verification at this head, and no `/claude/r0_steward`
Integration verdict exists (`open_blockers[13]`). This Tester verdict does not authorize a merge.

## Verdict

The Author's claims for this increment hold: every change bites when reverted, no test was added,
renamed, skipped or weakened, and the full check is 692/692 on the branch name. Of my thirteen
earlier conditions in this package's scope, eleven are closed by measurement, one (date-time) is
half closed and its remainder is the new low finding N1, and one (A4) was marked closed on a weaker
probe and is still open. Both can be closed inside this package's writable paths.

VERDICT: test_verified_with_conditions
