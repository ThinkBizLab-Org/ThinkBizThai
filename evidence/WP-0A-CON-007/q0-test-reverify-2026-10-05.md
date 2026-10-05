# WP-0A-CON-007 — Independent Tester re-verification at the 2026-10-06 head

Package: Reference fields are named and bounded
Tester run: `/claude/q0_sentinel` (declared `role_assignments.tester_agent_run_id`)
Author run under test: `/claude/a0_atlas` — a different run.
Subject: PR #188, branch `agent/claude/WP-0A-CON-007-reference-bounds`, head
`113e4f3950b917b6ed24410cbe52d429247c7e0e`. `origin/main` is `8c089cc0bf30a234efa61752c6054d670f85a2a8`,
the merge base the handoff cites, so the PR is up to date with `main`.
Earlier verdict re-checked: `evidence/WP-0A-CON-007/test-verdict-q0.md` (`test_verified_with_conditions`,
revision `03c584b`).
Protocol version: `1.0.0`. Gate: G0 — synthetic only, no provider, no credentials, no database.

## 0. What I am

I am a subagent spawned by `/claude/a0_atlas`'s workflow orchestration, running as the Tester role
`/claude/q0_sentinel` under RFC-2026-024 §3/3-4. The run that spawned me is this package's Author. Every
assigned role run on this package is the same vendor and model. Since the Product Owner's step-2 answer of
2026-10-05 (recorded in the manifest's `cross_vendor_exception`), that is no longer a recorded exception for
this package, but the reader should still know that the Author's workflow launched the Tester. What keeps
this independent is what the role does: I re-derived every figure below on a private clone, and I did not
copy any number from the Author's files. I do not fix. I wrote this one file and nothing else.

**This is independent Tester evidence only.** It is not the contract review, the security review, or the
integration verdict. It authorizes no merge and no gate movement.

## 1. Measured versus read

| Measured by this run (re-derived at `113e4f3`) | Read, not re-measured |
|---|---|
| every command in §2, with exit codes | the CI log body (I read the run's metadata: head SHA, branch, conclusion) |
| 39 mutations plus a control, each on a fresh copy (§3) | the pre-fix probe of the eight `event_id`-class neighbours (R-3); that is A1's finding |
| the catalog figures: 14 contracts, 76 reference-shaped fields, 49 unbounded in 9 contracts, longest reference 85, longest `*_ref` 48 | the Owner's words quoted in R-2 and in the manifest |
| the `length(...) <= 256` CHECK constraints in `db/foundation/migrations/` | whether RFC-2026-025 §5 item 6 makes this a governance PR (I agree that it edits an RFC) |
| test names unchanged, and exactly two integrity digests changed | C0's and A1's conditions, beyond where they overlap with mine |

All measurements ran in a private clone,
`/private/tmp/claude-501/-Users-bank-ThinkBizThai/27edf3de-b1b4-4cfe-a757-7d17332ec256/scratchpad/q0-WP-0A-CON-007/clone`.
It was checked out **on the branch name** `agent/claude/WP-0A-CON-007-reference-bounds`, with its upstream set
to `origin/agent/claude/WP-0A-CON-007-reference-bounds` (`git status -sb` shows the branch, not a detached
HEAD). This matters because the handoff guard skips on a detached HEAD and reads a false green. No database
was started. Nothing in this package's declared commands needs one, and port 5533 was not used.

## 2. Declared commands, at `113e4f3`, on the branch name

| Command | Result |
|---|---|
| `node --version` / `npm --version` | `v24.20.0` / `11.19.0` |
| `npm run check` (the manifest's `deterministic_commands.verify`) | exit `0` — `tests 692, pass 692, fail 0, cancelled 0, skipped 0, todo 0` |
| `npm run verify` | exit `0` — `clean: exit 0 — tests 692, pass 692, fail 0, skipped 0, todo 0` |
| `node --test test-kits/contracts/ctr-evt-001-schema-ref-bounds.test.mjs` | exit `0` — `tests 8, pass 8, fail 0, skipped 0, todo 0` |
| `node --test test-kits/contracts/schema-mutation-coverage.test.mjs` | exit `0` — `tests 10, pass 10, fail 0, skipped 0, todo 0` |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-CON-007.json` | exit `0` |
| `npm run check:handoff` | exit `0` — `handoffs/WP-0A-CON-007-author-handoff.json describes the branch: nothing substantive after its cited head` |
| `node scripts/verify-branch-scope.mjs origin/main WP-0A-CON-007` | exit `0` — `WP-0A-CON-007: all 7 changed path(s) are declared, and every amendment explains one` |
| GitHub CI on PR #188 | run `37357576105`, `bootstrap`, event `pull_request`, `headSha` `113e4f3950b917b6ed24410cbe52d429247c7e0e`, conclusion `success`. The PR is Draft, `OPEN`, `MERGEABLE`. |

`npm run check` includes `verify:coverage-floor`, so the integrity digests match the bytes on the branch.
The suite still has **0 skipped and 0 todo**, which is acceptance criterion 6.

The kit's eight test names are byte-identical to `8c089cc` (diff of the `test('…'` lines is empty). The
name digest `d1304414d53dccd7` and the declared count of 8 in `scripts/test-suite-contract.mjs` still hold.
`test-kits/integrity-manifest.json` changes exactly two digests, for
`architecture/decisions/RFC-2026-009-reference-bounds.md` and
`test-kits/contracts/ctr-evt-001-schema-ref-bounds.test.mjs`. That matches the manifest's
`authorized_cross_package_amendments` entry word for word.

## 3. Mutation campaign

Each mutation ran on a fresh copy of `contract-catalog/` and `test-kits/`, and I read the assertion message
for each one. A mutation counts as **caught** only when the message names what the mutation did. The
unmutated control copy passes 8/8. Survivors were re-run on a full copy without `.git`, after
`regenerate:manifest`, against `verify:coverage-floor`, every contract kit, and `ratchets-bite`. In that full
copy the control fails only the handoff and branch tests that need `.git`. Those are copy artifacts, and I
compared every survivor against that baseline.

### My earlier campaign, re-run at the new head

| # | Mutation | At `03c584b` | At `113e4f3` — message that fired |
|---|---|---|---|
| M01 | delete `maxLength` on `schema_ref` | caught | caught — `a schema_ref of the right shape and unbounded length must be rejected` + `reference-shaped field(s) with no upper bound: ctr-evt-001.metadata.schema_ref` |
| M02 | pattern → `^.*$` | caught | caught — `CTR-EVT-001 accepts hostile schema_ref(s): file:///etc/passwd, …` |
| M03 | `maxLength` 32 → 100000 | caught | caught |
| **M04** | `maxLength` 32 → 79 | **missed** | **caught** — `a 33-character well-formed schema_ref must be rejected; the bound has been raised past 32` |
| M04b | `maxLength` 32 → 33 (new) | — | caught, same message |
| **M05** | `maxLength` 32 → 18 | **missed** | **caught** — `CTR-EVT-001@111111.111111.111111 is 32 characters, at the declared bound, and must be accepted; the bound has been lowered` |
| M05b | `maxLength` 32 → 31 (new) | — | caught, same message |
| M06 | `maxLength` → `maximum` | caught | caught, from two directions |
| M07 | `stringBearer()` always `null` | caught by the canary only | caught by the canary **and** by the ratchet itself — `discovered 0 reference-shaped field(s), fewer than the 76 the catalog holds` |
| M08 | `referenceFields()` always `[]` | caught by the canary only | caught by both, same pair of messages |
| M09 | delete `ctr-evt-001/examples/valid.json` | caught (ENOENT) | caught (ENOENT). Diagnostics are unchanged: it reports a crash, not a statement about bounds. |
| M10 | delete `maxLength` on `ctr-job-001.input_ref` | caught | caught |
| M11 | new unbounded `callback_ref` in `ctr-job-001` | caught | caught |
| **M12** | new unbounded `callback_ref` in `ctr-sec-001` | **missed** | **caught** — `… in a contract this package does not own and not recorded in KNOWN_UNBOUNDED: ctr-sec-001.callback_ref` |
| M13 | drop 4 of 6 schemes from `ctr-api-001.accepted.status_ref` | caught | caught |
| M14 | RE2-uncompilable lookahead in `ctr-err-001` | caught | caught |
| **M15** | `properties: {}` on the four bounded contracts | **vacuous** — the ratchet passed over zero fields | **caught by the targeted test** — `discovered 55 reference-shaped field(s), fewer than the 76 the catalog holds` |
| **M16** | empty `shared-kernel` | **vacuous** — the RE2 sweep passed over zero directories | **caught by the targeted tests** — `walked 0 contract(s), fewer than the 14 the catalog holds` |
| **M17** | gut the array branch of `stringBearer` | **missed** (dead code) | **caught** — `discovery must find a nullable reference and an array of references` |

Every one of my earlier misses (M04, M05, M12, M17) and both vacuity findings (M15, M16) is now caught **by
the test that is named for the defect**, not by a sibling test that happens to fail.

### New mutations aimed at the 2026-10-06 additions

| # | Mutation | Result |
|---|---|---|
| N01 | drop `^` (C0 F1) | caught — `accepts hostile schema_ref(s): file:///CTR-EVT-001@1.0.0, javascript:CTR-EVT-001@1.0.0, ../../CTR-EVT-001@1.0.0` |
| N02 | `[A-Z]{3}` → `[A-Za-z]{3}` (C0 F3) | caught — `accepts hostile schema_ref(s): CTR-evt-001@1.0.0` |
| N03 | pattern also admits `https://[a-z./]+` (A1 S-3) | caught **only by the new shape-only arm** — `with the bound set aside, the schema_ref shape accepts: https://public.example.invalid/exfil -- only the length rejects them`. Without that arm this mutant would survive, because the 36-character URL is also over the bound. |
| N04 | drop `$` | caught — three suffix forms named |
| N05 | admit leading zeros in the version | caught — `CTR-EVT-001@01.0.0` |
| N06 | owner bounds `ctr-ntf-001.deep_link.target_ref` | caught — `KNOWN_UNBOUNDED names field(s) that are now bounded or gone; remove them from the list: ctr-ntf-001.deep_link.target_ref` |
| N07 | a listed field renamed away (`ctr-ten-001.request_id` → `request_token`) | caught, but by the field floor (`discovered 75 … fewer than the 76`) and by the fixture, **before** the stale-list message is reached. See O-2. |
| N08 | new unbounded `session_id` in `ctr-ten-001`, which rides inside every event | caught — `… not recorded in KNOWN_UNBOUNDED: ctr-ten-001.session_id` |
| N09 | a fifteenth contract directory with an unbounded `target_ref` | caught — `ctr-zzz-001.target_ref` |
| N10 | array of references bounded per item, with no `maxItems`, in `ctr-evt-001` | caught — `ctr-evt-001.related_event_ids (array with no maxItems)` |
| N11 | unbounded nullable `parent_event_id` in `ctr-evt-001` | caught — `ctr-evt-001.parent_event_id` |
| N12 | pinned 256 → 257 on `ctr-aud-001.change.after_ref` | caught — `reference field(s) whose accepted range has moved` |
| N13 | `schema_ref` made nullable | survives this kit. Caught at repository level by `no constraint value changes without the change being written down` and the mutation-coverage meta-ratchet. |
| N14 | `schema_ref` dropped from `metadata.required` | survives this kit. Caught at repository level by five tests, including `every contract reaches the mutation-coverage floor` and `every fixture agrees with its own shipped schema`. |
| N15 | `maxLength` written as the string `"32"` | caught — `no upper bound: ctr-evt-001.metadata.schema_ref` |
| T01 | test body: `else unrecorded.push(gap);` deleted | **survives everything**, including `verify:coverage-floor` after `regenerate:manifest`, all 79 contract-kit tests, and `ratchets-bite`. See O-1. |
| T02 | test body: `stale.clear()` before the stale assertion | **survives everything**, as T01 |
| T03 | test body: `CATALOG_REFERENCE_FIELD_FLOOR = 0` | **survives everything**, as T01 |
| T04 | test body: `withoutBound()` becomes a no-op | caught — `CTR-EVT-001@1111111.111111.111111 must satisfy the shape, or it proves nothing about the bound` |
| T05 | test body: the `maxItems` branch of `boundGaps` disabled | caught by the synthetic fragment |

**Tally for this package's own suite: 34 of 39 caught for the targeted reason (19 re-run, 15 new contract
mutations, 5 test-body mutations), with the control passing.** N13 and N14
are not this suite's responsibility and the repository catches them. T01 to T03 are edits to the test's own
body, and they are named in O-1.

## 4. Independently re-derived figures

My own walker (`properties` at every depth, the guard's name rule, string / nullable string / array-of-string,
not following `$ref`) over every directory that holds a `schema.json`:

```
contracts 14 | reference-shaped string fields 76
unbounded 49 {"ctr-aud-001":4,"ctr-err-001":2,"ctr-flg-001":4,"ctr-mod-001":4,"ctr-ntf-001":4,
              "ctr-obs-001":10,"ctr-sec-001":8,"ctr-ten-001":7,"ctr-usg-001":6}
name-matched but not string / array-of-string: none
longest reference-shaped value in a non-invalid example: 85  ctr-usg-001/examples/valid-provider-reported.json dedupe_key (then 81, 77)
longest *_ref value in a non-invalid example:             48  ctr-job-001/examples/valid.json input_ref
```

All of these agree with RFC-2026-009 R-1 and R-4, with the manifest blocker lines, and with `KNOWN_UNBOUNDED`
(49 entries, nine contracts, the same per-contract counts). The test passes with both an empty stale set and
an empty unrecorded set, so the list and the catalog match exactly. **Correction to my own record:** my earlier verdict
(§4) said 43 unbounded reference-shaped fields. The same walker run over `git archive 03c584b contract-catalog`
also gives `76` fields and `49` unbounded, with the same per-contract counts, so the catalog did not change and
my 43 was an undercount. The throwaway probe behind it was not kept, so I cannot say which six it missed. I
withdraw 43. The right figure is 49, and the Author's R-4 has it right.

The R-5 claim checks out arithmetically. `CTR-EVT-001@` plus `.0.0` takes 16 of the 32 characters, which leaves
a run of up to 16 digits in the major position. The R-6 claim checks out too: form 13 is 17 + 1 + 8 = 26
characters.

`length(...) <= 256` CHECK constraints, measured:

```
db/foundation/migrations/050_async_kernel.sql:531   length(input_ref) <= 256
db/foundation/migrations/050_async_kernel.sql:535   length(result_ref) <= 256
db/foundation/migrations/070_research.sql:792       length(object_ref) <= 256
db/foundation/migrations/110_meta_connector.sql:693 length(body_ref) <= 256
db/foundation/migrations/140_audit.sql:474          length(change_before_ref) <= 256
db/foundation/migrations/140_audit.sql:478          length(change_after_ref) <= 256
```

R-2 and the closure file name 050, 110 and 140. They omit 070. See O-3.

## 5. My earlier conditions

| # | Earlier condition | Status at `113e4f3` | Evidence |
|---|---|---|---|
| 1 | Pin `metadata.schema_ref`'s bound | **Closed** | M04, M04b, M05 and M05b are all caught. The pin is behavioural: 32 is accepted and 33 is rejected, and the 33-character value is checked to satisfy the shape first, so the test cannot be satisfied by the pattern (T04 proves that check is load-bearing). |
| 2 | Assert non-emptiness in the two discovery tests | **Closed** | M15 and M16 now fail the targeted tests themselves. Both tests assert at least 14 contracts, the ratchet asserts at least 76 fields, and the RE2 sweep asserts at least one pattern. |
| 3 | Test the array branch of `stringBearer` | **Closed** | M17 and T05 are caught by the synthetic fragment, which covers nullable, array-item and `maxItems` both unbounded and bounded. |
| 4 | Disclose all seven CTR-TEN-001 fields and that `referenceFields` does not follow `$ref` (named, not a condition) | **Closed** | R-4 lists all seven and says the discovery does not follow `$ref`. The guard now sees them by walking `ctr-ten-001` itself (N08). |
| 5 | Reconcile the three scope numbers (named, not a condition) | **Closed** | R-4's last paragraph reconciles four, five and thirteen, and `amends_without_owning` is gone. |
| 6 | M12 stands (named, not a condition) | **Closed** | The ratchet now discovers contracts (M12, N09). |

## 6. New findings

None blocks. None is stop-the-line.

**O-1 — the new catalog-wide ratchet has no meta-ratchet (low).** T01, T02 and T03 each disable the part of
the ratchet that closes M12, the stale list, or the field floor. Each changes no test name and no assertion
count, so after the sanctioned `regenerate:manifest` every repository guard stays green. The kit's digest does
change, so a reviewer reading the diff would see it. But `test-kits/ratchets-bite.test.mjs`'s check over this
suite (`the schema-ref ratchet notices two unrelated reversals`) probes only `maxLength = 4096` and
`pattern = '^.*$'`. Adding a third reversal there, such as an unbounded reference in a contract this package
does not own, would make T01 visible. That file is outside this package's writable paths. It belongs to the
`ratchets-bite` owner and is a suggestion, not a condition.

**O-2 — the field floor equals the count, and it fires before the named message (low, diagnostics).**
`CATALOG_REFERENCE_FIELD_FLOOR` is 76, which is exactly the current count. When another owner renames or
retypes a listed field (N07), the ratchet fails with `discovered 75 … fewer than the 76 the catalog holds`.
That message names no field. The stale-list assertion, which would name it, comes later in the same test and
is never reached. The failure is correct, but the first message points away from the cause. Moving the floor
assertions after the three list assertions would fix the order. A floor set a little below the count would
also avoid failing on a legitimate removal. This is a suggestion only.

**O-3 — R-2's list of migrations that carry 256 is incomplete (low, record precision).** R-2 and
`author-conditions-closure-2026-10-06.md` §3 name 050, 140 and 110. `070_research.sql:792` also enforces
`length(object_ref) <= 256`. `object_ref`, like `110`'s `body_ref`, is not a field of the four bounded
contracts, so the list mixes contract fields and non-contract fields and still misses one of the latter. The
conclusion ("a change in either direction needs a forward migration") is unaffected. Whoever next edits R-2
should add 070.

**O-4 — `KNOWN_UNBOUNDED`'s owner labels are not checked (informational).** The owning-package string on each
entry is never asserted. A wrong owner would pass. It is documentation inside the test, and the RFC's R-4
table is the record of ownership.

**Not re-tested here:** the "not done" items in the Author's report: the `x-bound-note` correction (owed by
WP-0A-CON-001), the 49 bounds and the CTR-JOB-001 bare strings (other owners), schema_ref 24 (a suggestion),
and the cross-validator `format` test (deferred). Each is recorded in the manifest's `open_blockers` and the
RFC as described, and I confirmed that wording. None of them is a Tester condition.

## 7. Stop-the-line and merge

**Stop-the-line: no.** There is no secret, tenant leakage, duplicate side effect, lost job, migration
divergence, irreversible deletion or contract mismatch. The contracts are byte-for-byte unchanged in this
increment (`verify-branch-scope` shows the seven changed paths, and none is under `contract-catalog/`). The
256 bounds still agree with the database CHECK constraints.

**Does anything from the Tester block the merge: no.** The merge still needs what this file cannot give: the
C0 and A1 re-checks, `/claude/r0_steward`'s Integration verdict, the Integration Owner's disposition of the PR
#12 sequencing, and, because the PR edits an Approved RFC, the Product Owner's own merge. Those are process
prerequisites named in the manifest, not Tester findings.

## 8. Verdict

**test_verified.**

All three conditions from my earlier `test_verified_with_conditions` are closed, and the three named items
are closed too. The mutation campaign was re-run, not read: every earlier miss and both vacuity findings are
now caught by the test named for each defect, and the new arms (shape-only, anchor, letter class,
catalog-wide discovery, stale list) each kill a mutant that would otherwise survive. `npm run check` is green
on the branch name with 692/692 passing and 0 skipped, CI is green at the exact head, and the RFC's corrected
figures match my independent measurements. O-1 to O-4 are suggestions for other owners or for a later edit,
not conditions.

## Reproduction

The scripts are throwaway and not committed. Each one rebuilds the suite's own logic in a few lines plus the
mutations listed above, and every result in this file is verbatim stdout:

- `…/scratchpad/q0-WP-0A-CON-007/mutate.mjs` runs each mutation on a fresh copy of `contract-catalog/` and
  `test-kits/`.
- `…/scratchpad/q0-WP-0A-CON-007/fullcopy.mjs` runs the survivors on a full copy without `.git`:
  `regenerate:manifest`, `verify:coverage-floor`, every contract kit, and `ratchets-bite`.
- `…/scratchpad/q0-WP-0A-CON-007/probe.mjs` is the independent catalog walk and fixture-length scan.

The clone was never mutated. Synthetic values only. No network beyond `git fetch` of this repository and a
`gh` read of PR #188 and its CI run.

Tester: `/claude/q0_sentinel`. Revision `113e4f3950b917b6ed24410cbe52d429247c7e0e`.
